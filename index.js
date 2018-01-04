'use strict';
const wreck = require('wreck');
const crypto = require('crypto');

class MailchimpSubscribe {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = `https://${apiKey.split('-')[1]}.api.mailchimp.com/3.0`;
    this.interestsCache = [];
  }

  async request(endpoint, method, data) {
    const response = await wreck.request(method, `${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Basic ${new Buffer(`mailchimp_user:${this.apiKey}`).toString('base64')}`
      },
      payload: JSON.stringify(data)
    });

    const body = await wreck.read(response, { json: true });
    if (response.statusCode !== 200) {
      throw new Error(body.detail);
    }

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
    categories.categories.forEach(cat => {
      promiseArr.push(this.listInterestsByCategory(cat.list_id, cat.id));
    });
    const results = await Promise.all(promiseArr);

    const interests = results.reduce((acc, curr) => acc.concat(curr.interests), []);

    this.interestsCache[listId] = interests;

    return interests;
  }

  async parseInterests(listId, interests) {
    const interestArray = interests.split(',');
    const allInterests = await this.listAllInterests(listId);
    const interestObject = {};
    allInterests.forEach((i) => {
      if (interestArray.includes(i.name)) {
        interestObject[i.id] = true;
      }
    });

    return interestObject;
  }

  async updateUser(listId, email, interests, mergeVars, status) {
    const emailHash = crypto.createHash('md5').update(email).digest('hex');

    if (typeof interests === 'string') {
      interests = await this.parseInterests(listId, interests);
    }

    if (!interests) {
      interests = {};
    }

    if (!mergeVars) {
      mergeVars = {};
    }

    const data = {
      interests,
      status,
      email_address: email,
      status_if_new: status,
      merge_fields: mergeVars
    };
    const endpoint = `/lists/${listId}/members/${emailHash}`;
    return this.request(endpoint, 'PUT', data);
  }

  subscribe(listId, email, interests, mergeVars) {
    return this.updateUser(listId, email, interests, mergeVars, 'subscribed');
  }

  unsubscribe(listId, email) {
    return this.updateUser(listId, email, null, null, 'unsubscribed');
  }
}

module.exports = MailchimpSubscribe;
