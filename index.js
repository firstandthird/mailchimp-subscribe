'use strict';
const wreck = require('wreck');
const crypto = require('crypto');
class MailchimpSubscribe {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = `https://${apiKey.split('-')[1]}.api.mailchimp.com/3.0`;
  }

  request(endpoint, method, data, done) {
    wreck.request(method, `${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Basic ${new Buffer(`mailchimp_user:${this.apiKey}`).toString('base64')}`
      },
      payload: JSON.stringify(data)
    }, (err, response, json) => {
      if (err) {
        return done(err);
      }
      wreck.read(response, { json: true }, (err, body) => {
        if (response.statusCode !== 200) {
          return done(body);
        }
        done(null, body);
      });
    });
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
    const endpoint = `/lists/${listId}/members/${emailHash}`;
    this.request(endpoint, 'PUT', data, done);
  }

  subscribe(listId, email, interests, mergeVars, done) {
    this.updateUser(listId, email, interests, mergeVars, 'subscribed', done);
  }
}

module.exports = MailchimpSubscribe;
