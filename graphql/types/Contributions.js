const { gql } = require("apollo-server");

const Contributions = gql`
  type ContributionsNRewards {
    contributions: String
    totalVsdot: String
    totalRewardList: [TokenReward]
  }

  type TotalContributionsNRewards {
    token_reward_amount: String
    channel_reward_amount: String
    early_bird_reward_amount: String
    inviting_reward_amount: String
    invited_reward_amount: String
    total_reward: String
  }

  type TokenReward {
    tokenName: String
    rewardAmount: String
  }

  type SalpContributionDetails {
    salpContributionDetails: [Detail]
  }

  type InvitingInfo {
    campaignId: String
    paraId: String
    inviteeCount: Int
    invitingAmount: String
    invitingList: [InvitingDetail]
    campaignRewardList: [TokenReward]
  }

  type InvitedInfo {
    campaignId: String
    paraId: String
    invitedAmount: String
    invitedList: [InvitedDetail]
    campaignRewardList: [TokenReward]
  }

  type InvitingDetail {
    invitee: String
    timestamp: String
    paraId: String
    balance: String
  }

  type InvitedDetail {
    inviter: String
    timestamp: String
    paraId: String
    balance: String
  }

  type Detail {
    timestamp: String
    paraId: String
    balance: String
  }

  type OfficialContributionsNRewards {
    contributions: String
    totalRewardList: [TokenReward]
  }
  type OfficialContributionDetails {
    officialContributionDetails: [Detail]
  }
  type SalpInvitingContributions {
    campaignInvitingDetails: [InvitingInfo]
    totalInvitingAmount: String
    totalInvitingRewardList: [TokenReward]
  }
  type SalpInvitedContributions {
    campaignInvitedDetails: [InvitedInfo]
    totalInvitedAmount: String
    totalInvitedRewardList: [TokenReward]
  }

  type AccountCampContributions {
    accountCampContributions: [CampContribution]
  }
  type CampContribution {
    campaignId: String
    paraId: String
    totalAmount: String
    totalCount: Int
  }

  type Query {
    getSalpContributionsNRewards(
      account: String!
      campaignIndex: String
    ): ContributionsNRewards # Salp渠道贡献及奖励
    getSalpContributionDetails(
      account: String!
      campaignIndex: String
    ): SalpContributionDetails # Salp个人贡献明细
    getOfficialContributionsNRewards(
      account: String!
      campaignIndex: String
    ): OfficialContributionsNRewards
    getOfficialContributionDetails(
      account: String!
      campaignIndex: String
    ): OfficialContributionDetails
    getSalpInvitingContributions(
      account: String!
      campaignIndex: String
    ): SalpInvitingContributions
    getSalpInvitedContributions(
      account: String!
      campaignIndex: String
    ): SalpInvitedContributions
    getSalpPerCampaignContributions(
      account: String!
      campaignIndex: String
    ): AccountCampContributions
    getOfficialPerCampaignContributions(
      account: String!
      campaignIndex: String
    ): AccountCampContributions
    getTotalContributionsNRewards(
      account: String!
      campaignIndex: String!
    ): TotalContributionsNRewards # Salp渠道贡献及各种奖励加总
  }
`;

module.exports = Contributions;
