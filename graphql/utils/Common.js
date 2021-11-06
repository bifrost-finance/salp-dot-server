import BigNumber from "bignumber.js";
import dotenv from "dotenv";
import { sequelize } from "../../server/models";
import { QueryTypes } from "sequelize";
dotenv.config();

const MULTISIG_ACCOUNT = process.env.MULTISIG_ACCOUNT.split("|"); // 多签账户地址列表
export const KSM_AUTHENTICATION_AMOUNT = 100000000000; // 10^11 = 0.1 KSM
export const STOP_KSM_BLOCK = 8423835;

// *************************
// return bignumber format. Only valid for single layer filed.
export const getSumOfAFieldFromList = (list, field) => {
  return list
    .map((item) => new BigNumber(item[field]))
    .reduce((a, b) => a.plus(b), new BigNumber(0));
};

const INVITATION_START_TIME = parseInt(process.env.INVITATION_START_TIME);
const INVITATION_END_TIME = parseInt(process.env.INVITATION_END_TIME);
const SALP_WHITELIST_AHEAD_HOURS = parseFloat(
  process.env.SALP_WHITELIST_AHEAD_HOURS
);
const SALP_START_TIME = parseInt(process.env.SALP_START_TIME);
const SALP_END_TIME = parseInt(process.env.SALP_END_TIME);
const SALP_TARGET = process.env.SALP_TARGET;
const STRAIGHT_REWARD_COEFFICIENT = parseFloat(
  process.env.STRAIGHT_REWARD_COEFFICIENT
);
const SUCCESSFUL_AUCTION_REWARD_COEFFICIENT = parseFloat(
  process.env.SUCCESSFUL_AUCTION_REWARD_COEFFICIENT
);
const ROYALTY_COEFFICIENT = parseFloat(process.env.ROYALTY_COEFFICIENT);

const SECONDS_PER_HOUR = 60 * 60;

// *************************
// 获取个人contributions的总额
export const getPersonalContributions = async (account, models) => {
  if (!account) return;

  const queryString = `WHERE "from" = '${account}' AND "to" IN ${getStringQueryList(
    MULTISIG_ACCOUNT
  )}`;
  const result = await sequelize.query(
    `SELECT SUM(amount::bigint) FROM transactions ${queryString} `,
    { type: QueryTypes.SELECT }
  );

  let personalContributions = new BigNumber(0);
  if (result[0].sum) {
    personalContributions = new BigNumber(result[0].sum);
  }

  return personalContributions;
};

// **************************************
// 从一个字符串数组获取查询的where in语句字符串
export const getStringQueryList = (stringList) => {
  if (stringList.length == 0) {
    return "";
  }

  let queryString = "(";
  let i;
  for (i = 0; i < stringList.length - 1; i++) {
    queryString += `'${stringList[i]}',`;
  }
  queryString += `'${stringList[i]}')`;

  return queryString;
};

