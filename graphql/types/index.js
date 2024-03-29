import { mergeTypes } from "merge-graphql-schemas";

import Campaign from "./Campaign";
import Contributions from "./Contributions";

const typeDefs = [Campaign, Contributions];

// NOTE: 2nd param is optional, and defaults to false
// Only use if you have defined the same type multiple times in
// different files and wish to attempt merging them together.
module.exports = mergeTypes(typeDefs, { all: true });
