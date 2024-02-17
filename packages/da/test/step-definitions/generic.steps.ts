import { TestMessaging } from '../support/TestMessaging';
import { createDefaultChannels } from '../support/DefaultUserChannels';
import { DataTable, Given, Then, When } from '@cucumber/cucumber'
import { expect } from 'expect';
import { doesRowMatch, handleResolve, matchData } from '../support/matching';
import { CustomWorld } from '../world/index';
import { BasicDesktopAgent, DefaultAppSupport, DefaultChannelSupport, DefaultIntentSupport } from '../../src';

Given('A Desktop Agent in {string}', function (this: CustomWorld, field: string) {

    if (!this.messaging) {
        this.messaging = new TestMessaging();
    }

    this.props[field] = new BasicDesktopAgent (
        new DefaultChannelSupport(this.messaging, createDefaultChannels(this.messaging), null),
        new DefaultIntentSupport(this.messaging),
        new DefaultAppSupport(this.messaging, {
            appId: "Test App Id",
            desktopAgent: "Test DA",
            instanceId: "123-ABC"
        }),
        "2.0",
        "cucumber-provider"
    )

    this.props['result'] = null
})

When('I call {string} with {string}', async function (this: CustomWorld, field: string, fnName: string) {
    const fn = this.props[field][fnName];
    const result = await fn.call(this.props[field])
    this.props['result'] = result;
})

When('I call {string} with {string} with parameter {string}', async function (this: CustomWorld, field: string, fnName: string, param: string) {
    try {
        const fn = this.props[field][fnName];
        const result = await fn.call(this.props[field], handleResolve(param, this))
        this.props['result'] = result;
    } catch (error) {
        this.props['result'] = error
    }
})

When('I call {string} with {string} with parameters {string} and {string}', async function (this: CustomWorld, field: string, fnName: string, param1: string, param2: string) {
    const fn = this.props[field][fnName];
    const result = await fn.call(this.props[field], handleResolve(param1, this), handleResolve(param2, this))
    this.props['result'] = result;
});

When('I refer to {string} as {string}', async function (this: CustomWorld, from: string, to: string) {
    this.props[to] = this.props[from];
})

Then('{string} is an array of objects with the following contents', function (this: CustomWorld, field: string, dt: DataTable) {
    matchData(this, this.props[field], dt)
});

Then('{string} is an array of strings with the following values', function (this: CustomWorld, field: string, dt: DataTable) {
    const values = this.props[field].map((s: string) => {return { "value": s }})
    matchData(this, values, dt)
});

Then('{string} is an object with the following contents', function (this: CustomWorld, field: string, params: DataTable) {
    const table = params.hashes()
    expect(doesRowMatch(this, table[0], this.props[field])).toBeTruthy();
});

Then('{string} is null', function (this: CustomWorld, field: string) {
    expect(this.props[field]).toBeNull()
})

Then('{string} is empty', function (this: CustomWorld, field: string) {
    expect(this.props[field]).toHaveLength(0)
})

Then('{string} is {string}', function (this: CustomWorld, field: string, expected: string) {
    const fVal = handleResolve(field, this)
    const eVal = handleResolve(expected, this)
    expect(""+fVal).toEqual(""+eVal)        
})

Then('{string} is an error with message {string}', function (this: CustomWorld, field: string, errorType: string) {
    expect(this.props[field]['message']).toBe(errorType)  
})

Given('{string} is a invocation counter into {string}', function(this: CustomWorld, handlerName: string, field: string) {
    this.props[handlerName] = () => {
      var amount : number = this.props[field]
      amount ++;
      this.props[field] = amount
    }
    this.props[field] = 0;
  })