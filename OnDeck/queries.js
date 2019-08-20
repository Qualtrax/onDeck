const getReleases = `query GetReleases($owner: String!, $name: String!){
  repository(owner: $owner, name: $name) {
    refs(last: 10, refPrefix: "refs/tags/") {
      tags: edges {
        node {
          tag: target {
            ... on Tag {
              id
              name
              commit: target {
                ... on Commit {
                  id
                  committedDate
                }
              }
            }
          }
        }
      }
    }
  }
}`;
const getCommits = `query GetCommits($owner: String!, $name: String!, $date: GitTimestamp!){
  repository(owner: $owner, name: $name) {
    defaultBranchRef {
      target {
        ... on Commit {
          history(since: $date) {
            totalCount
            commits: edges {
              commit: node {
                ... on Commit {
                  committedDate
                  messageHeadline
                }
              }
            }
            pageInfo {
              endCursor
              hasNextPage
            }
          }
        }
      }
    }
  }
}`;

module.exports = {
  getReleases,
  getCommits
}