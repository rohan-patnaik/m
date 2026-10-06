import {ConvexClient} from 'convex/browser';
import {anyApi} from 'convex/server';
import {equal,changesBetween,mergeRecords} from './records.js';
import * as batchMath from './batch-math.js';
window.BatchMath=batchMath;
window.MealCloud={ConvexClient,api:anyApi,equal,changesBetween,mergeRecords};
