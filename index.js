'use strict';
const wreck = require('wreck');
const crypto = require('crypto');
class MailchimpSubscribe {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = `https://${apiKey.split('-')[1]}.api.mailchimp.com/3.0`;
  }

  updateUser(listId, email, interests, mergeVars, status, done) {
    const emailHash = crypto.createHash('md5').update(email).digest('hex');

    const data = {
      interests,
      status,
      email_address: email,
      status_if_new: status,
      merge_fields: mergeVars
    };
    const endpoint = `${this.baseUrl}/lists/${listId}/members/${emailHash}`;
    wreck.put(endpoint, {
      json: true,
      headers: {
        Authorization: `Basic ${new Buffer(`mailchimp_user:${this.apiKey}`).toString('base64')}`
      },
      payload: JSON.stringify(data)
    }, (err, response, json) => {
      if (err) {
        return done(err);
      }
      done(null, json);
    });
  }

  subscribe(listId, email, interests, mergeVars, done) {
    this.updateUser(listId, email, interests, mergeVars, 'subscribed', done);
  }
}

module.exports = MailchimpSubscribe;
