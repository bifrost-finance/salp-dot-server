import BigNumber from "bignumber.js";
import { Op } from "sequelize";
import { sequelize } from "../../server/models";
import { getSumOfAFieldFromList } from "../utils/Common";

// GraphQL查询的resolver
const Contributions = {
  // ===========================================================================
  // ? QUERIES
  // ===========================================================================
  Query: {
    /// 获取个人SALP总贡献金额及衍生品和奖励情况
    getSalpContributionsNRewards: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      let campaign_condition = {};
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }
      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);

      let accountCampContributions = [];
      let vsdot_amount = new BigNumber(0); // vsdot数量
      let rewards_amount_total = {}; // 奖励json格式
      let rewards_amount_list = []; // 奖励数组格式
      if (campaigns != []) {
        accountCampContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  [sequelize.literal(`SUM(balance::bigint)`), "total_amount"],
                ],
                where: {
                  from: account,
                  para_id: para_id,
                  [Op.and]: [
                    {
                      block_timestamp: {
                        [Op.gte]: new Date(salp_start_time * 1000),
                      },
                    },
                    {
                      block_timestamp: {
                        [Op.lte]: new Date(salp_end_time * 1000),
                      },
                    },
                  ],
                },
                raw: true,
              };
              let result = await models.TransferBatches.findAll(condition);

              if (result[0]["total_amount"]) {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(result[0]["total_amount"]),
                };
              } else {
                return { campaign_id, para_id, total_amount: new BigNumber(0) };
              }
            }
          )
        );

        // 把个人没有贡献的campaign过滤掉
        let accountCampContributionsFiltered = [];
        for (const campCon of accountCampContributions) {
          if (campCon["total_amount"].isGreaterThan(0)) {
            accountCampContributionsFiltered.push(campCon);
          }
        }

        // 返回之前，以及计算vsDot和奖励金额
        for (const {
          campaign_id,
          para_id,
          total_amount,
        } of accountCampContributionsFiltered) {
          // vsdot金额等于投票金额
          vsdot_amount = vsdot_amount.plus(total_amount);
          // 获取奖励币种及比率
          const reward_condition = {
            where: { campaign_id: campaign_id },
            raw: true,
          };
          const reward_list = await models.Rewards.findAll(reward_condition);

          for (const {
            reward_coin_symbol,
            reward_coefficient,
          } of reward_list) {
            const token_reward_amount =
              total_amount.multipliedBy(reward_coefficient);

            if (!rewards_amount_total[reward_coin_symbol]) {
              rewards_amount_total[reward_coin_symbol] = token_reward_amount;
            } else {
              rewards_amount_total[reward_coin_symbol] =
                rewards_amount_total[reward_coin_symbol].plus(
                  token_reward_amount
                );
            }
          }
        }
      }
      // 把json变成数组
      if (rewards_amount_total != {}) {
        rewards_amount_list = Object.keys(rewards_amount_total).map(
          (token_symbol) => {
            return {
              tokenName: token_symbol,
              rewardAmount: rewards_amount_total[token_symbol].toFixed(0),
            };
          }
        );
      }
      return {
        contributions: vsdot_amount.toFixed(0),
        totalVsdot: vsdot_amount.toFixed(0),
        totalRewardList: rewards_amount_list,
      };
    },
    /// 获取个人SALP贡献明细
    getSalpContributionDetails: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {
        attributes: ["block_timestamp", "para_id", "balance"],
        order: [["block_timestamp", "DESC"]],
        raw: true,
      };
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        let campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };

        let campaign_result = await models.SalpCampaigns.findAll(
          campaign_condition
        );

        if (campaign_result != []) {
          condition["where"] = {
            from: account,
            para_id: campaign_result[0].para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(campaign_result[0].salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(campaign_result[0].salp_end_time * 1000),
                },
              },
            ],
          };
        }
      } else {
        condition["where"] = { from: account };
      }
      let result = await models.TransferBatches.findAll(condition);

      result = result.map(({ block_timestamp, para_id, balance }) => {
        return {
          timestamp: block_timestamp,
          paraId: para_id,
          balance,
        };
      });

      return { salpContributionDetails: result };
    },
    /// 获取个人官方总crowdloan贡献金额及奖励情况
    getOfficialContributionsNRewards: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      let campaign_condition = {};
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }
      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);
      let accountCampContributions = [];
      let rewards_amount_total = {}; // 奖励json格式
      let rewards_amount_list = []; // 奖励数组格式
      let contributions_amount = new BigNumber(0);
      if (campaigns != []) {
        accountCampContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  [
                    sequelize.literal(`SUM(balance_of::bigint)`),
                    "total_amount",
                  ],
                ],
                where: {
                  account_id: account,
                  para_id: para_id,
                  [Op.and]: [
                    {
                      block_timestamp: {
                        [Op.gte]: new Date(salp_start_time * 1000),
                      },
                    },
                    {
                      block_timestamp: {
                        [Op.lte]: new Date(salp_end_time * 1000),
                      },
                    },
                  ],
                },
                raw: true,
              };
              let result = await models.Contributeds.findAll(condition);

              if (result[0]["total_amount"]) {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(result[0]["total_amount"]),
                };
              } else {
                return { campaign_id, para_id, total_amount: new BigNumber(0) };
              }
            }
          )
        );

        // 把个人没有贡献的campaign过滤掉
        let accountCampContributionsFiltered = [];
        for (const campCon of accountCampContributions) {
          if (campCon["total_amount"].isGreaterThan(0)) {
            accountCampContributionsFiltered.push(campCon);
          }
        }

        // 返回之前，以及计算vsDot和奖励金额
        for (const {
          campaign_id,
          para_id,
          total_amount,
        } of accountCampContributionsFiltered) {
          // vsdot金额等于投票金额
          contributions_amount = contributions_amount.plus(total_amount);
          // 获取奖励币种及比率
          const reward_condition = {
            where: { campaign_id: campaign_id },
            raw: true,
          };
          const reward_list = await models.Rewards.findAll(reward_condition);

          for (const {
            reward_coin_symbol,
            reward_coefficient,
          } of reward_list) {
            const token_reward_amount =
              total_amount.multipliedBy(reward_coefficient);

            if (!rewards_amount_total[reward_coin_symbol]) {
              rewards_amount_total[reward_coin_symbol] = token_reward_amount;
            } else {
              rewards_amount_total[reward_coin_symbol] =
                rewards_amount_total[reward_coin_symbol].plus(
                  token_reward_amount
                );
            }
          }
        }
      }
      // 把json变成数组
      if (rewards_amount_total != {}) {
        rewards_amount_list = Object.keys(rewards_amount_total).map(
          (token_symbol) => {
            return {
              tokenName: token_symbol,
              rewardAmount: rewards_amount_total[token_symbol].toFixed(0),
            };
          }
        );
      }
      return {
        contributions: contributions_amount.toFixed(0),
        totalRewardList: rewards_amount_list,
      };
    },
    /// 获取个人官方crowdloan明细贡献金额
    getOfficialContributionDetails: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {
        attributes: ["block_timestamp", "para_id", "balance"],
        order: [["block_timestamp", "DESC"]],
        raw: true,
      };
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        let campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };

        let campaign_result = await models.SalpCampaigns.findAll(
          campaign_condition
        );

        if (campaign_result != []) {
          condition["where"] = {
            account_id: account,
            para_id: campaign_result[0].para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(campaign_result[0].salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(campaign_result[0].salp_end_time * 1000),
                },
              },
            ],
          };
        }
      } else {
        condition["where"] = { account_id: account };
      }
      let result = await models.Contributeds.findAll(condition);

      result = result.map(({ block_timestamp, para_id, balance_of }) => {
        return {
          timestamp: block_timestamp,
          paraId: para_id,
          balance: balance_of,
        };
      });

      return { officialContributionDetails: result };
    },
    /// 查看个人邀请情况
    getSalpInvitingContributions: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {
        attributes: ["from", "block_timestamp", "para_id", "balance"],
        order: [["block_timestamp", "DESC"]],
        raw: true,
      };

      let campaign_condition = {};
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }

      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);

      let accountCampInvitingContributions = [];
      let accountCampInvitingContributionsFiltered = [];
      let total_inviting_amount = new BigNumber(0); // 全部campaign加起来的邀请投票数量
      let rewards_amount_total = {}; // 奖励json格式
      let rewards_amount_list = []; // 奖励数组格式

      if (campaigns != []) {
        accountCampInvitingContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: ["from", "block_timestamp", "para_id", "balance"],
                where: {
                  referrer: account,
                  para_id: para_id,
                  [Op.and]: [
                    {
                      block_timestamp: {
                        [Op.gte]: new Date(salp_start_time * 1000),
                      },
                    },
                    {
                      block_timestamp: {
                        [Op.lte]: new Date(salp_end_time * 1000),
                      },
                    },
                  ],
                },
                raw: true,
              };

              let result = await models.TransferBatches.findAll(condition);

              let condition2 = condition;
              condition2["attributes"] = [
                [
                  sequelize.literal(`COUNT(DISTINCT("from"))`),
                  "countOfInvitees",
                ],
              ];
              condition2["distinct"] = true;

              let invitee_rs = await models.TransferBatches.findAll(condition2);
              let invitee_count = 0;
              if (invitee_rs != []) {
                invitee_count = invitee_rs[0]["countOfInvitees"];
              }

              console.log("invitee_count");
              console.log(invitee_count);

              let inviting_amount = new BigNumber(0);
              if (result != []) {
                inviting_amount = getSumOfAFieldFromList(result, "balance");

                // 格工化结果
                result = result.map(
                  ({ from, block_timestamp, para_id, balance }) => {
                    return {
                      invitee: from,
                      timestamp: block_timestamp,
                      paraId: para_id,
                      balance,
                    };
                  }
                );
              }

              return {
                campaign_id,
                para_id,
                invitee_count,
                inviting_amount,
                inviting_list: result,
              };
            }
          )
        );

        // 把个人没有邀请金额的campaign过滤掉
        for (const campCon of accountCampInvitingContributions) {
          if (campCon["inviting_amount"].isGreaterThan(0)) {
            accountCampInvitingContributionsFiltered.push(campCon);
          }
        }

        // 计算每个campaign的奖励情况
        accountCampInvitingContributionsFiltered = await Promise.all(
          accountCampInvitingContributionsFiltered.map(
            async ({
              campaign_id,
              para_id,
              invitee_count,
              inviting_amount,
              inviting_list,
            }) => {
              // 获取奖励币种及比率
              const reward_condition = {
                where: { campaign_id: campaign_id },
                raw: true,
              };
              let campaign_reward_list = await models.InvitingRewards.findAll(
                reward_condition
              );

              campaign_reward_list = campaign_reward_list.map(
                ({ reward_coin_symbol, reward_coefficient }) => {
                  const token_reward_amount =
                    inviting_amount.multipliedBy(reward_coefficient);
                  return {
                    tokenName: reward_coin_symbol,
                    rewardAmount: token_reward_amount.toFixed(0),
                  };
                }
              );

              return {
                campaignId: campaign_id,
                paraId: para_id,
                inviteeCount: invitee_count,
                invitingAmount: inviting_amount.toFixed(0),
                invitingList: inviting_list,
                campaignRewardList: campaign_reward_list,
              };
            }
          )
        );

        // 返回之前，计算加总的邀请金额和邀请奖励金额
        for (const {
          invitingAmount,
          campaignRewardList,
        } of accountCampInvitingContributionsFiltered) {
          invitingAmount = new BigNumber(invitingAmount);
          // 累积计算所有campaign的邀请投票金额
          total_inviting_amount = total_inviting_amount.plus(invitingAmount);

          for (const { tokenName, rewardAmount } of campaignRewardList) {
            rewardAmount = new BigNumber(rewardAmount);
            if (!rewards_amount_total[tokenName]) {
              rewards_amount_total[tokenName] = rewardAmount;
            } else {
              rewards_amount_total[tokenName] =
                rewards_amount_total[tokenName].plus(rewardAmount);
            }
          }
        }
      }

      // 把json变成数组
      if (rewards_amount_total != {}) {
        rewards_amount_list = Object.keys(rewards_amount_total).map(
          (token_symbol) => {
            return {
              tokenName: token_symbol,
              rewardAmount: rewards_amount_total[token_symbol].toFixed(0),
            };
          }
        );
      }

      return {
        campaignInvitingDetails: accountCampInvitingContributionsFiltered,
        totalInvitingAmount: total_inviting_amount.toFixed(0),
        totalInvitingRewardList: rewards_amount_list,
      };
    },
    /// 查看个人被邀请情况
    getSalpInvitedContributions: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      // 如果不传参数，则返回所有campaign列表
      let condition = {
        attributes: ["from", "block_timestamp", "para_id", "balance"],
        order: [["block_timestamp", "DESC"]],
        raw: true,
      };

      let campaign_condition = {};
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }

      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);

      let accountCampInvitedContributions = [];
      let accountCampInvitedContributionsFiltered = [];
      let total_invited_amount = new BigNumber(0); // 全部campaign加起来的邀请投票数量
      let rewards_amount_total = {}; // 奖励json格式
      let rewards_amount_list = []; // 奖励数组格式

      if (campaigns != []) {
        accountCampInvitedContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  "referrer",
                  "block_timestamp",
                  "para_id",
                  "balance",
                ],
                where: {
                  from: account,
                  referrer: {
                    [Op.ne]: null,
                  },
                  para_id: para_id,
                  [Op.and]: [
                    {
                      block_timestamp: {
                        [Op.gte]: new Date(salp_start_time * 1000),
                      },
                    },
                    {
                      block_timestamp: {
                        [Op.lte]: new Date(salp_end_time * 1000),
                      },
                    },
                  ],
                },
                raw: true,
              };

              let result = await models.TransferBatches.findAll(condition);

              let invited_amount = new BigNumber(0);
              if (result != []) {
                invited_amount = getSumOfAFieldFromList(result, "balance");

                // 格式化结果
                result = result.map(
                  ({ referrer, block_timestamp, para_id, balance }) => {
                    return {
                      inviter: referrer,
                      timestamp: block_timestamp,
                      paraId: para_id,
                      balance,
                    };
                  }
                );
              }

              return {
                campaign_id,
                para_id,
                invited_amount,
                invited_list: result,
              };
            }
          )
        );

        // 把个人没有邀请金额的campaign过滤掉
        for (const campCon of accountCampInvitedContributions) {
          if (campCon["invited_amount"].isGreaterThan(0)) {
            accountCampInvitedContributionsFiltered.push(campCon);
          }
        }

        // 计算每个campaign的奖励情况
        accountCampInvitedContributionsFiltered = await Promise.all(
          accountCampInvitedContributionsFiltered.map(
            async ({ campaign_id, para_id, invited_amount, invited_list }) => {
              // 获取奖励币种及比率
              const reward_condition = {
                where: { campaign_id: campaign_id },
                raw: true,
              };
              let campaign_reward_list = await models.InvitingRewards.findAll(
                reward_condition
              );

              campaign_reward_list = campaign_reward_list.map(
                ({ reward_coin_symbol, invited_reward_coefficient }) => {
                  const token_reward_amount = invited_amount.multipliedBy(
                    invited_reward_coefficient
                  );
                  return {
                    tokenName: reward_coin_symbol,
                    rewardAmount: token_reward_amount.toFixed(0),
                  };
                }
              );

              return {
                campaignId: campaign_id,
                paraId: para_id,
                invitedAmount: invited_amount.toFixed(0),
                invitedList: invited_list,
                campaignRewardList: campaign_reward_list,
              };
            }
          )
        );

        // 返回之前，计算加总的邀请金额和邀请奖励金额
        for (const {
          invitedAmount,
          campaignRewardList,
        } of accountCampInvitedContributionsFiltered) {
          invitedAmount = new BigNumber(invitedAmount);
          // 累积计算所有campaign的邀请投票金额
          total_invited_amount = total_invited_amount.plus(invitedAmount);

          for (const { tokenName, rewardAmount } of campaignRewardList) {
            rewardAmount = new BigNumber(rewardAmount);
            if (!rewards_amount_total[tokenName]) {
              rewards_amount_total[tokenName] = rewardAmount;
            } else {
              rewards_amount_total[tokenName] =
                rewards_amount_total[tokenName].plus(rewardAmount);
            }
          }
        }
      }

      // 把json变成数组
      if (rewards_amount_total != {}) {
        rewards_amount_list = Object.keys(rewards_amount_total).map(
          (token_symbol) => {
            return {
              tokenName: token_symbol,
              rewardAmount: rewards_amount_total[token_symbol].toFixed(0),
            };
          }
        );
      }

      return {
        campaignInvitedDetails: accountCampInvitedContributionsFiltered,
        totalInvitedAmount: total_invited_amount.toFixed(0),
        totalInvitedRewardList: rewards_amount_list,
      };
    },

    /// 查看个人Salp按campaign分组所获得的分开的贡献
    getSalpPerCampaignContributions: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      let accountCampContributions = [];
      let accountCampContributionsFiltered = [];

      let campaign_condition = {};
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }

      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);

      if (campaigns != []) {
        accountCampContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  [sequelize.literal(`SUM(balance::bigint)`), "total_amount"],
                  [sequelize.literal(`COUNT(balance)`), "total_count"],
                ],
                where: {
                  from: account,
                  para_id: para_id,
                  [Op.and]: [
                    {
                      block_timestamp: {
                        [Op.gte]: new Date(salp_start_time * 1000),
                      },
                    },
                    {
                      block_timestamp: {
                        [Op.lte]: new Date(salp_end_time * 1000),
                      },
                    },
                  ],
                },
                raw: true,
              };
              let result = await models.TransferBatches.findAll(condition);

              if (result[0]["total_amount"]) {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(result[0]["total_amount"]),
                  total_count: result[0]["total_count"],
                };
              } else {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(0),
                  total_count: result[0]["total_count"],
                };
              }
            }
          )
        );

        // 把个人没有贡献的campaign过滤掉
        for (const {
          campaign_id,
          para_id,
          total_amount,
          total_count,
        } of accountCampContributions) {
          if (total_amount.isGreaterThan(0)) {
            accountCampContributionsFiltered.push({
              campaignId: campaign_id,
              paraId: para_id,
              totalAmount: total_amount.toFixed(0),
              totalCount: total_count,
            });
          }
        }
      }

      return {
        accountCampContributions: accountCampContributionsFiltered,
      };
    },
    /// 查看个人官方crowdloan按campaign分组所获得的分开的贡献
    getOfficialPerCampaignContributions: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      let accountCampContributions = [];
      let accountCampContributionsFiltered = [];

      let campaign_condition = {};
      // 如果传了account，刚查询该account的信息，如果没传，则查询所有的信息，这时候会用到limit
      if (campaignIndex) {
        // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
        campaign_condition = {
          where: {
            campaign_id: campaignIndex,
          },
          raw: true,
        };
      }

      let campaigns = await models.SalpCampaigns.findAll(campaign_condition);

      if (campaigns != []) {
        accountCampContributions = await Promise.all(
          campaigns.map(
            async ({
              campaign_id,
              para_id,
              salp_start_time,
              salp_end_time,
            }) => {
              let condition = {
                attributes: [
                  [
                    sequelize.literal(`SUM(balance_of::bigint)`),
                    "total_amount",
                  ],
                  [sequelize.literal(`COUNT(balance_of)`), "total_count"],
                ],
                where: {
                  account_id: account,
                  para_id: para_id,
                  [Op.and]: [
                    {
                      block_timestamp: {
                        [Op.gte]: new Date(salp_start_time * 1000),
                      },
                    },
                    {
                      block_timestamp: {
                        [Op.lte]: new Date(salp_end_time * 1000),
                      },
                    },
                  ],
                },
                raw: true,
              };
              let result = await models.Contributeds.findAll(condition);

              if (result[0]["total_amount"]) {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(result[0]["total_amount"]),
                  total_count: result[0]["total_count"],
                };
              } else {
                return {
                  campaign_id,
                  para_id,
                  total_amount: new BigNumber(0),
                  total_count: result[0]["total_count"],
                };
              }
            }
          )
        );

        // 把个人没有贡献的campaign过滤掉
        for (const {
          campaign_id,
          para_id,
          total_amount,
          total_count,
        } of accountCampContributions) {
          if (total_amount.isGreaterThan(0)) {
            accountCampContributionsFiltered.push({
              campaignId: campaign_id,
              paraId: para_id,
              totalAmount: total_amount.toFixed(0),
              totalCount: total_count,
            });
          }
        }
      }

      return {
        accountCampContributions: accountCampContributionsFiltered,
      };
    },
    /// 获取个人SALP总贡献金额及衍生品和奖励情况
    getTotalContributionsNRewards: async (
      parent,
      { account, campaignIndex },
      { models }
    ) => {
      // 先查出来campaign的时间段，然后再查询时间段内的贡献交易
      let campaign_condition = {
        where: {
          campaign_id: campaignIndex,
        },
        raw: true,
      };

      let campaign = await models.SalpCampaigns.findOne(campaign_condition);

      if (campaign) {
        let {
          campaign_id,
          para_id,
          salp_start_time,
          salp_end_time,
          early_bird_end_time,
        } = campaign;

        // 计算因贡献而得的直接奖励
        let condition1 = {
          attributes: [
            [sequelize.literal(`SUM(balance::bigint)`), "straight_amount"],
          ],
          where: {
            from: account,
            para_id: para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(salp_end_time * 1000),
                },
              },
            ],
          },
          raw: true,
        };
        let result1 = await models.TransferBatches.findOne(condition1);

        let straight_amount = new BigNumber(0);
        if (result1.straight_amount) {
          straight_amount = new BigNumber(result1["straight_amount"]);
        }

        console.log("result1: ", result1);

        // 计算早鸟奖励
        let condition2 = {
          attributes: [
            [sequelize.literal(`SUM(balance::bigint)`), "early_bird_amount"],
          ],
          where: {
            from: account,
            para_id: para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(early_bird_end_time * 1000),
                },
              },
            ],
          },
          raw: true,
        };
        let result2 = await models.TransferBatches.findOne(condition2);

        let early_bird_amount = new BigNumber(0);
        if (result2.early_bird_amount) {
          early_bird_amount = new BigNumber(result2["early_bird_amount"]);
        }

        console.log("result2: ", result2);

        // 获取奖励币种及比率
        const reward_condition = {
          where: { campaign_id: campaign_id },
          raw: true,
        };
        const reward = await models.Rewards.findOne(reward_condition);

        let reward_coefficient = 0;
        let early_bird_extra_reward_coefficient = 0;
        if (reward) {
          reward_coefficient = reward.reward_coefficient;
          early_bird_extra_reward_coefficient =
            reward.early_bird_extra_reward_coefficient;
        }

        // 直接奖励金额
        const token_reward_amount =
          straight_amount.multipliedBy(reward_coefficient);

        // 早鸟奖励金额
        const early_bird_reward_amount = early_bird_amount.multipliedBy(
          early_bird_extra_reward_coefficient
        );

        // 下面计算邀请奖励和被邀请奖励
        // 邀请奖励

        let condition3 = {
          attributes: [
            [sequelize.literal(`SUM(balance::bigint)`), "inviting_amount"],
          ],
          where: {
            referrer: account,
            para_id: para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(salp_end_time * 1000),
                },
              },
            ],
          },
          raw: true,
        };

        let result3 = await models.TransferBatches.findOne(condition3);

        let inviting_amount = new BigNumber(0);
        if (result3.inviting_amount) {
          inviting_amount = new BigNumber(result3["inviting_amount"]);
        }

        // 计算被邀请金额
        let condition4 = {
          attributes: [
            [sequelize.literal(`SUM(balance::bigint)`), "invited_amount"],
          ],
          where: {
            from: account,
            referrer: {
              [Op.ne]: "",
            },
            para_id: para_id,
            [Op.and]: [
              {
                block_timestamp: {
                  [Op.gte]: new Date(salp_start_time * 1000),
                },
              },
              {
                block_timestamp: {
                  [Op.lte]: new Date(salp_end_time * 1000),
                },
              },
            ],
          },
          raw: true,
        };

        let result4 = await models.TransferBatches.findOne(condition4);

        console.log("result4: ", result4);

        let invited_amount = new BigNumber(0);
        if (result4.invited_amount) {
          invited_amount = new BigNumber(result4["invited_amount"]);
        }

        // 获取邀请奖励币种及比率
        const inviting_reward_condition = {
          where: { campaign_id: campaign_id },
          raw: true,
        };
        let campaign_reward = await models.InvitingRewards.findOne(
          inviting_reward_condition
        );

        let inviting_reward_coefficient = 0;
        let invited_reward_coefficient = 0;

        if (campaign_reward) {
          inviting_reward_coefficient = campaign_reward.reward_coefficient;
          invited_reward_coefficient =
            campaign_reward.invited_reward_coefficient;
        }

        const inviting_reward_amount = inviting_amount.multipliedBy(
          inviting_reward_coefficient
        );

        const invited_reward_amount = invited_amount.multipliedBy(
          invited_reward_coefficient
        );

        // 加总所有的奖励
        const total_reward = token_reward_amount
          .plus(early_bird_reward_amount)
          .plus(inviting_reward_amount)
          .plus(invited_reward_amount);

        return {
          token_reward_amount: token_reward_amount.toFixed(0),
          early_bird_reward_amount: early_bird_reward_amount.toFixed(0),
          inviting_reward_amount: inviting_reward_amount.toFixed(0),
          invited_reward_amount: invited_reward_amount.toFixed(0),
          total_reward: total_reward.toFixed(0),
        };
      }
    },
  },
};

module.exports = Contributions;
