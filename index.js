const wreck = require('wreck');
const crypto = require('crypto');
const Boom = require('boom');

class MailchimpSubscribe {
  constructor(apiKey, debug = false) {
    this.apiKey = apiKey;
    this.baseUrl = `https://${apiKey.split('-')[1]}.api.mailchimp.com/3.0`;
    this.interestsCache = [];
    this.debug = debug;
  }

  async request(endpoint, method, data) {
    const response = await wreck.request(method, `${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Basic ${new Buffer(`mailchimp_user:${this.apiKey}`).toString('base64')}`
      },
      payload: JSON.stringify(data)
    });

    const body = await wreck.read(response, { json: true });

    return body;
  }

  listInterestCategories(listId) {
    return this.request(`/lists/${listId}/interest-categories`, 'GET', {});
  }

  interestCategoryInfo(listId, interestCategoryId) {
    return this.request(`/lists/${listId}/interest-categories/${interestCategoryId}`, 'GET', {});
  }

  listInterestsByCategory(listId, interestCategoryId) {
    return this.request(`/lists/${listId}/interest-categories/${interestCategoryId}/interests`, 'GET', {});
  }

  async listAllInterests(listId) {
    if (this.interestsCache[listId]) {
      return this.interestsCache[listId];
    }

    const categories = await this.listInterestCategories(listId);
    const promiseArr = [];

    if (categories && Array.isArray(categories.categories)) {
      categories.categories.forEach(cat => {
        promiseArr.push(this.listInterestsByCategory(cat.list_id, cat.id));
      });
    } else {
      throw Boom.badData('Invalid response data', categories);
    }

    const results = await Promise.all(promiseArr);

    const interests = results.reduce((acc, curr) => acc.concat(curr.interests), []);

    this.interestsCache[listId] = interests;

    return interests;
  }

  parseInterestString(interests) {
    const interestArray = interests.split(',');
    const interestObject = {};
    interestArray.forEach(interest => {
      const intArr = interest.split(':');
      if (!interestObject[intArr[0]]) {
        interestObject[intArr[0]] = [];
      }
      interestObject[intArr[0]].push(intArr[1]);
    });

    return interestObject;
  }

  async parseInterests(listId, interests) {
    if (!interests) {
      return {};
    }

    if (typeof interests === 'string') {
      interests = this.parseInterestString(interests);
    }

    const ints = {};
    const allCategories = await this.listInterestCategories(listId);

    const catObj = {};

    if (allCategories && Array.isArray(allCategories.categories)) {
      allCategories.categories.forEach(cat => {
        catObj[cat.title] = cat.id;
      });
    } else {
      throw Boom.badData('Invalid response data', allCategories);
    }

    const promiseArr = Object.keys(interests).map(async (key) => {
      if (catObj[key]) {
        const catInts = await this.listInterestsByCategory(listId, catObj[key]);
        catInts.interests.forEach((i) => {
          let intName = interests[key];
          if (typeof intName === 'string') {
            intName = [intName];
          }
          intName.forEach(nm => {
            if (nm === i.name) {
              ints[i.id] = true;
            }
          });
        });
      }
    });

    await Promise.all(promiseArr);
    return ints;
  }

  async updateUser(listId, email, interests, mergeVars, status) {
    const emailHash = crypto.createHash('md5').update(email).digest('hex');

    interests = await this.parseInterests(listId, interests);

    const data = {
      email_address: email
    };

    if (status) {
      data.status = status;
      data.status_if_new = status;
    } else {
      data.status_if_new = 'subscribed';
    }

    if (interests) {
      data.interests = interests;
    }

    if (mergeVars) {
      data.merge_fields = mergeVars;
    }

    const endpoint = `/lists/${listId}/members/${emailHash}`;

    if (this.debug) {
      console.log(['MailchimpSubscribe', 'debug'], {
        endpoint,
        data
      });

      if (this.debug === 'log') {
        return;
      }
    }

    return this.request(endpoint, 'PUT', data);
  }

  subscribe(listId, email, interests, mergeVars) {
    return this.updateUser(listId, email, interests, mergeVars, 'subscribed');
  }

  unsubscribe(listId, email) {
    return this.updateUser(listId, email, null, null, 'unsubscribed');
  }

  getExistingTags(listId) {
    return this.request(`/lists/${listId}/segments`, 'GET', {});
  }

  createTag(listId, tag, email) {
    const packet = { name: tag };
    if (email) {
      packet.static_segment = [email];
    }
    return this.request(`/lists/${listId}/segments`, 'POST', packet);
  }

  async assignTagsToUser(listId, email, tagsArray, createIfNotExists = false) {
    const existingTagList = await this.getExistingTags(listId);
    // make sure all tags exist:
    const existingTags = [];
    existingTagList.segments.forEach(segment => {
      if (tagsArray.includes(segment.name)) {
        existingTags.push(segment);
        tagsArray.splice(tagsArray.indexOf(segment.name), 1);
      }
    });
    // will still contain tags that don't exist
    // make a new one if it does not exist:
    if (tagsArray.length !== 0) {
      if (createIfNotExists) {
        await Promise.all(tagsArray.map(tag => this.createTag(listId, tag, email)));
      } else {
        throw new Error(`Trying to assign tags that have not been created yet:  ${tagsArray.join(',')}`);
      }
    }
    await Promise.all(existingTags.map(segment =>
      this.request(`/lists/${listId}/segments/${segment.id}`, 'POST', {
        members_to_add: [email]
      })
    ));
  }

  async removeTags(listId, email, tagsArray) {
    const existingTagList = await this.getExistingTags(listId);
    const existingTags = [];
    existingTagList.segments.forEach(segment => {
      if (tagsArray.includes(segment.name)) {
        existingTags.push(segment);
      }
    });
    await Promise.all(existingTags.map(segment =>
      this.request(`/lists/${listId}/segments/${segment.id}`, 'POST', {
        members_to_remove: [email]
      })
    ));
  }

  async getTagsByUser(listId, email) {
    const emailHash = crypto.createHash('md5').update(email).digest('hex');
    const member = await this.request(`/lists/${process.env.LIST_ID}/members/${emailHash}`, 'GET');
    if (!member.tags) {
      return [];
    }
    return member.tags.map(t => t.name);
  }
}

module.exports = MailchimpSubscribe;
