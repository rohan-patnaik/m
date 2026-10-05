import {defineSchema,defineTable} from 'convex/server';
import {v} from 'convex/values';
export default defineSchema({legacyArchives:defineTable({fingerprint:v.string(),data:v.string(),createdAt:v.number()}).index('by_fingerprint',['fingerprint']),records:defineTable({key:v.string(),value:v.any(),revision:v.number()}).index('by_key',['key'])});
