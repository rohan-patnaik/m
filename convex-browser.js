import {ConvexClient} from 'convex/browser';
import {anyApi} from 'convex/server';
import {equal,changesBetween,mergeRecords} from './records.js';
window.MealCloud={ConvexClient,api:anyApi,equal,changesBetween,mergeRecords};
