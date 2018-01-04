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
});

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

test('get interests returns from cache', async (t) => {
  t.plan(2);
  const subscriber = new Subscribe(process.env.API_KEY);
  const dummyId = 'dhf238hdfs';
  subscriber.interestsCache[dummyId] = [{ name: 'Dummy Interest', id: '923423980234'}];

  const interests = await subscriber.listAllInterests(dummyId);
  t.equals(interests[0].name, 'Dummy Interest');
  t.equals(interests[0].id, '923423980234');
});

test('allows string interests to be parsed', async (t) => {
  t.plan(2);
  const subscriber = new Subscribe(process.env.API_KEY);
  const intArr = ['Free'];
  const interestObj = await subscriber.parseInterests(process.env.LIST_ID, intArr.join(','));
  t.ok(interestObj, 'returns a formatted interest obj');
  t.same(interestObj, { 'abb786b9ac': true });
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

test('subscribe with array of interests', async (t) => {
  t.plan(2);

  const subscriber = new Subscribe(process.env.API_KEY);
  const email = randomEmail();

  const result = await subscriber.subscribe(process.env.LIST_ID, email, { 'abb786b9ac': true }, {});
  t.ok(result);
  t.same(result.interests, { 'abb786b9ac': true, '38a9e1227b': false });
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

test('allows updating users', async (t) => {
  const subscriber = new Subscribe(process.env.API_KEY);
  const email = randomEmail();
  const results = await subscriber.subscribe(process.env.LIST_ID, email, {}, {
    FNAME: 'Bob',
    LNAME: 'Smith'
  });

  t.equal(typeof results, 'object');
  t.equal(results.merge_fields.FNAME, 'Bob');

  const updResults = await subscriber.updateUser(process.env.LIST_ID, email, {}, {
    FNAME: 'John'
  }, 'subscribed');

  t.equal(typeof updResults, 'object');
  t.equal(updResults.merge_fields.FNAME, 'John');

});

test('updating interests with string converts to object', async (t) => {
  t.plan(2);

  const subscriber = new Subscribe(process.env.API_KEY);
  const email = randomEmail();

  const result = await subscriber.updateUser(process.env.LIST_ID, email, 'Paid', {}, 'subscribed');
  t.equal(typeof result, 'object');
  t.same(result.interests, { 'abb786b9ac': false, '38a9e1227b': true });
});
