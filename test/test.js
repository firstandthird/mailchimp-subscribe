const tape = require('tape');
const Subscribe = require('../');

tape('initalize', (t) => {
  t.plan(1);
  const subscriber = new Subscribe(process.env.MAILCHIMP_API_KEY);
  t.ok(subscriber, `a mailchimp subscriber can be initialized with MAILCHIMP_API_KEY = ${process.env.MAILCHIMP_API_KEY}`);
});

tape('subscribe', (t) => {
  t.plan(2);
  const subscriber = new Subscribe(process.env.MAILCHIMP_API_KEY);
  subscriber.subscribe(process.env.MAILCHIMP_LIST_ID, 'clyde@example.com', { bananas: true }, { var1: 'yes', var2: 'no' }, (err, results) => {
    t.notOk(err);
    t.equal(typeof results, 'object');
    console.log(results)
  });

  tape('updateUser', (t) => {
  });
});
