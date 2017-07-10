Sendanor Cloud Backend
----------------------

This is a CLI application to run Sendanor's Cloud Service Framework.

This application is still in active development and probably has few bugs in it. Please submit issues and we'll look at 
it.

### Install

`npm i -g @sendanor/cloud-backend`

### Tutorial

***Note!*** This example assumes you are familiar with babel-cli and use it to convert your ES6 files.

We'll start two different systems in this example which talk to each other. We'll run them on the same local machine, 
but they could be anywhere in the network.

First we'll create a test service which saves a time when `.updateDate()` is triggered.

```javascript
export default class DateService {

	constructor () {
		this.date = new Date();
	}

	updateDate () {
		this.date = new Date();
	}

}
```

With this service instance, you can see the `date` property and you can call `.updateDate()`.

Then we'll create another service which uses our `DateService`:


```javascript
export default class TestDateService {

	constructor (DateService) {
		this._Date = DateService;
	}

	updateDate () {
		return this._Date.updateDate();
	}

}
```

Note! Any property with leading `_` will be private and not shared with other systems.

Our `TestDateService` can set a time, but cannot see it.

Next we'll start our first daemon:

```
$ cloud-backend ./dist/examples/DateService.js --protocol=http --auth=basic:demo:'$apr1$N8FG9xe6$KRqwt39aE3UX4szXSeeZD0'
2017-07-10T09:22:14+03:00 [main] Added credentials for auth basic for user demo
2017-07-10T09:22:14+03:00 [ServiceCache] Registered ServiceCache with UUID 0c49ef8e-d22d-4fcb-b662-57722ccbd64b
2017-07-10T09:22:14+03:00 [ServiceCache] Registered DateService with UUID 85ade1e9-0c42-45b6-85c5-51586cde7093
2017-07-10T09:22:14+03:00 [main] All services started.
2017-07-10T09:22:14+03:00 [main] All services initialized.
2017-07-10T09:22:14+03:00 [main] Basic auth support enabled.
2017-07-10T09:22:14+03:00 [main] Service DateService started at port 3000 as http
```

* The password for HTTP basic auth is `test` and username is `demo`.

Then we'll start our other service and connect to remote `DateService`:

```
$ node ./dist/main.js http://demo:test@localhost:3000 ./dist/examples/TestDateService.js --port=3001 --protocol=http --listen=TestDateService
2017-07-10T09:27:16+03:00 [ServiceCache] Registered ServiceCache with UUID 5aa563b0-584c-4338-9cb1-caae6efb081f
2017-07-10T09:27:16+03:00 [ServiceCache] No service DateService for TestDateService. Waiting 1 s.
2017-07-10T09:27:16+03:00 [ServiceCache] Registered DateService with UUID 2922feaa-0430-42bd-a11a-9d951931d068
2017-07-10T09:27:17+03:00 [ServiceCache] Registered TestDateService with UUID 4ae03a09-2460-4416-8555-4f21585e6093
2017-07-10T09:27:17+03:00 [main] All services started.
2017-07-10T09:27:17+03:00 [main] All services initialized.
2017-07-10T09:27:17+03:00 [main] Service TestDateService started at port 3001 as http
```

Now we can access `TestDateService` as an unprotected service at `http://localhost:3001`:

```
$ curl http://localhost:3001
{
  "$id": "5667dd0c-16bb-5761-b95b-431f2132eb06",
  "$hash": "0d6be056bed96911d812800ec7d7c973825296e057be76d1eec9b2b0f33cf346",
  "$ref": "http://localhost:3001/",
  "$type": "TestDateService",
  "$prototype": {
    "$id": "b35c596f-8a0c-53d7-9d1e-dd7ca50bfec1",
    "$hash": "1d4ed609bcf686ced0ec5082febe9d21134b2d5cf4d6451545c88640734502b7",
    "$ref": "http://localhost:3001/",
    "$name": "TestDateService",
    "$type": [
      "TestDateService"
    ],
    "updateDate": {
      "$ref": "http://localhost:3001/updateDate",
      "$type": "Function",
      "$method": "post",
      "$args": [],
      "length": 0,
      "name": "updateDate"
    }
  }
}
```

We can trigger new date like this:

```
$ curl -X POST http://localhost:3001/updateDate
{
  "$ref": "http://localhost:3001/updateDate",
  "$path": "payload",
  "$type": "undefined"
}
```

We can also access `DateService` directly as a password protected service at `http://demo:test@localhost:3000`:

```
$ curl http://demo:test@localhost:3000
{
  "$id": "852aa819-0167-5cac-b45d-43437f2e8277",
  "$hash": "9301e63a3dc7f62e6779e70aed643a2c2c9e812168bd62e7d22fb194574bcd18",
  "$ref": "http://localhost:3000/",
  "$type": "DateService",
  "date": "2017-07-10T06:56:17.729Z",
  "$prototype": {
    "$id": "f765f856-2da9-51cc-86da-12584a2f5dce",
    "$hash": "86226f83510a5eadc231aeffa8ddeca25ef30e2a4cbcab1d8817e39d4940207b",
    "$ref": "http://localhost:3000/",
    "$name": "DateService",
    "$type": [
      "DateService"
    ],
    "updateDate": {
      "$ref": "http://localhost:3000/updateDate",
      "$type": "Function",
      "$method": "post",
      "$args": [],
      "length": 0,
      "name": "updateDate"
    }
  }
}
```

* Notice how `DateService` has a readable property `date`, but `TestDateService` does not have it.

### Different ways of running

Use as a client-verified protected HTTPS server: `cloud-backend ./TestService.js --ca-file=./ca-crt.pem --key-file=./localhost-key.pem --cert-file=./localhost-crt.pem --protocol=https`

Use as an unprotected HTTP server: `cloud-backend ./TestService.js --protocol=http`

Use without a server: `cloud-backend ./TestService.js`
