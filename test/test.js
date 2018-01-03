const test = require('tap').test;
const Subscribe = require('../');

if (!process.env.API_KEY || !process.env.LIST_ID) {
  throw new Error('API_KEY and LIST_ID must be set');
}

const randomEmail = function() {
  const num = Math.floor(Math.random() * 999) + 1;
  return `mcsubscribe_${num}@firstandthird.com`;
}

test('initalize', (t) => {
  const subscriber = new Subscribe(process.env.API_KEY);
  t.ok(subscriber, `a mailchimp subscriber can be initialized with API_KEY = ${process.env.API_KEY}`);
  t.end();
});

test('throws error on error', async (t) => {
  t.plan(1);
  const subscriber = new Subscribe(process.env.API_KEY);
  const result = subscriber.request(`/lists/${process.env.LIST_ID}/members/zxyey`, 'PUT', { email_address: 'nothing' });
  t.rejects(result, {}, 'Does not throw a good error');
})

test('list interests', async (t) => {
  const subscriber = new Subscribe(process.env.API_KEY);
  const results = await subscriber.listInterestCategories(process.env.LIST_ID);
  t.ok(results.categories, 'returns a list of 0 or more categories');
  t.end();
});

test('list information about an interest category', async (t) => {
  const subscriber = new Subscribe(process.env.API_KEY);
  const categoryList = await subscriber.listInterestCategories(process.env.LIST_ID);
  const category = categoryList.categories[0];

  if (category) {
    const infoResults = await subscriber.interestCategoryInfo(process.env.LIST_ID, category.id);
    t.ok(infoResults.title, 'returns the title and other parts of the interests cateogry');
  }
  t.end();
});

test('get all interests for a list', async (t) => {
  t.plan(1);
  const subscriber = new Subscribe(process.env.API_KEY);
  const interests = await subscriber.listAllInterests(process.env.LIST_ID);
  t.ok(interests, 'returns one or more interests without error');
});

test('subscribe', async (t) => {
  t.plan(4);
  const subscriber = new Subscribe(process.env.API_KEY);
  const results = await subscriber.subscribe(process.env.LIST_ID, randomEmail(), null, {
    FNAME: 'Bob',
    LNAME: 'Smith'
  });

  t.equal(typeof results, 'object');
  t.equal(results.merge_fields.FNAME, 'Bob');
  t.equal(results.merge_fields.LNAME, 'Smith');
  t.equal(results.status, 'subscribed');
});

test('unsubscribe', async (t) => {
  t.plan(3);
  const subscriber = new Subscribe(process.env.API_KEY);
  const emailAddress = randomEmail();
  const subscribeResult = await subscriber.subscribe(process.env.LIST_ID, emailAddress, {
  }, {
    FNAME: 'Bob',
    LNAME: 'Smith'
  });

  t.equal(typeof subscribeResult, 'object');

  const unsubResult = await subscriber.unsubscribe(process.env.LIST_ID, emailAddress);

  t.equal(typeof unsubResult, 'object');
  t.equal(unsubResult.status, 'unsubscribed');
});
