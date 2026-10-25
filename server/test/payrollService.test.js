import test from "node:test";
import assert from "node:assert/strict";
import {calculateAnnualTax} from "../utils/tax.js";
import {countWorkingDays} from "../services/payrollService.js";

test("annual PKR tax slabs calculate progressive amounts at boundaries",()=>{
 assert.equal(calculateAnnualTax(600000),0);
 assert.equal(calculateAnnualTax(1200000),30000);
 assert.equal(calculateAnnualTax(2400000),210000);
 assert.equal(calculateAnnualTax(3600000),510000);
 assert.equal(calculateAnnualTax(4600000),860000);
});

test("working-day count excludes configured weekends and public holidays",()=>{
 assert.equal(countWorkingDays(new Date("2024-01-01T00:00:00Z"),new Date("2024-01-05T00:00:00Z"),[0,6],new Set(["2024-01-03"])),4);
 assert.equal(countWorkingDays(new Date("2024-01-06T00:00:00Z"),new Date("2024-01-07T00:00:00Z"),[0,6],new Set()),0);
});
