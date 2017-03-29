const test = require('tape');
const Subscribe = require('../');

if (!process.env.API_KEY || !process.env.LIST_ID) {
  throw new Error('API_KEY and LIST_ID must be set');
}

const randomEmail = function() {
  const num = Math.floor(Math.random() * 999) + 1;
  return `mcsubscribe_${num}@firstandthird.com`;
}

test('initalize', (t) => {
  t.plan(1);
  const subscriber = new Subscribe(process.env.API_KEY);
  t.ok(subscriber, `a mailchimp subscriber can be initialized with API_KEY = ${process.env.API_KEY}`);
});

test('list interests', (t) => {
  t.plan(2);
  const subscriber = new Subscribe(process.env.API_KEY);
  subscriber.listInterests(process.env.LIST_ID, (err, results) => {
    t.equal(err, null, 'does not error when fetching list of interests');
    t.ok(results.categories, 'returns a list of 0 or more categories');
    t.end();
  });
});

test('list information about an interest category', (t) => {
  t.plan(2);
  const subscriber = new Subscribe(process.env.API_KEY);
  subscriber.listInterests(process.env.LIST_ID, (err, results) => {
    const category = results.categories[0];
    if (category) {
      subscriber.interestInfo(process.env.LIST_ID, category.id, (err, info) => {
        t.equal(err, null, 'does not error when fetching interest info');
        t.ok(info.title);
        t.end();
      });
    }
  });
});

test('subscribe', (t) => {
  t.plan(6);
  const subscriber = new Subscribe(process.env.API_KEY);
  subscriber.subscribe(process.env.LIST_ID, randomEmail(), {
    '80e101c6e8': true
  }, {
    FNAME: 'Bob',
    LNAME: 'Smith'
  }, (err, results) => {
    t.notOk(err);
    t.equal(typeof results, 'object');
    t.equal(results.merge_fields.FNAME, 'Bob');
    t.equal(results.merge_fields.LNAME, 'Smith');
    t.equal(results.interests['80e101c6e8'], true);
    t.equal(results.status, 'subscribed');
  });

});

test.skip('unsubscribe', (t) => {
  t.plan(2);
  const subscriber = new Subscribe(process.env.API_KEY);
  subscriber.subscribe(process.env.LIST_ID, randomEmail(), {
  }, {
    FNAME: 'Bob',
    LNAME: 'Smith'
  }, (err, results) => {
    t.notOk(err);
    t.equal(typeof results, 'object');
    console.log(results)
  });

});
