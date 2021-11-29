const { gql } = require("apollo-server");

const Contributions = gql`
  type ContributionsNRewards {
    contributions: String
    totalVsdot: String
    totalRewardList: [TokenReward]
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

  type InvitingDetail {
    invitee: String
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
    getSalpPerCampaignContributions(
      account: String!
      campaignIndex: String
    ): AccountCampContributions
    getOfficialPerCampaignContributions(
      account: String!
      campaignIndex: String
    ): AccountCampContributions
  }
`;

module.exports = Contributions;
