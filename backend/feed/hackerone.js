const request = require('request-promise');

async function HackerOne(num_reports = 25) {
    var o = {
        method: 'POST',
        url: "https://hackerone.com/graphql",
        headers: {
            "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "content-type": "application/json",
            "x-auth-token": "----",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
        },
        body: { "operationName": "HacktivityPageQuery", "variables": { "querystring": "", "where": { "report": { "disclosed_at": { "_is_null": false } } }, "orderBy": { "field": "popular", "direction": "DESC" }, "secureOrderBy": null, "count": num_reports, "maxShownVoters": 0 }, "query": "query HacktivityPageQuery($querystring: String, $orderBy: HacktivityItemOrderInput, $secureOrderBy: FiltersHacktivityItemFilterOrder, $where: FiltersHacktivityItemFilterInput, $count: Int, $cursor: String, $maxShownVoters: Int) {\n  me {\n    id\n    __typename\n  }\n  hacktivity_items(first: $count, after: $cursor, query: $querystring, order_by: $orderBy, secure_order_by: $secureOrderBy, where: $where) {\n    total_count\n    ...HacktivityList\n    __typename\n  }\n}\n\nfragment HacktivityList on HacktivityItemConnection {\n  total_count\n  pageInfo {\n    endCursor\n    hasNextPage\n    __typename\n  }\n  edges {\n    node {\n      ... on HacktivityItemInterface {\n        id\n        databaseId: _id\n        ...HacktivityItem\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment HacktivityItem on HacktivityItemUnion {\n  type: __typename\n  ... on HacktivityItemInterface {\n    id\n    votes {\n      total_count\n      __typename\n    }\n    voters: votes(last: $maxShownVoters) {\n      edges {\n        node {\n          id\n          user {\n            id\n            username\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    upvoted: upvoted_by_current_user\n    __typename\n  }\n  ... on Undisclosed {\n    id\n    ...HacktivityItemUndisclosed\n    __typename\n  }\n  ... on Disclosed {\n    id\n    ...HacktivityItemDisclosed\n    __typename\n  }\n  ... on HackerPublished {\n    id\n    ...HacktivityItemHackerPublished\n    __typename\n  }\n}\n\nfragment HacktivityItemUndisclosed on Undisclosed {\n  id\n  reporter {\n    id\n    username\n    ...UserLinkWithMiniProfile\n    __typename\n  }\n  team {\n    handle\n    name\n    medium_profile_picture: profile_picture(size: medium)\n    url\n    id\n    ...TeamLinkWithMiniProfile\n    __typename\n  }\n  latest_disclosable_action\n  latest_disclosable_activity_at\n  requires_view_privilege\n  total_awarded_amount\n  currency\n  __typename\n}\n\nfragment TeamLinkWithMiniProfile on Team {\n  id\n  handle\n  name\n  __typename\n}\n\nfragment UserLinkWithMiniProfile on User {\n  id\n  username\n  __typename\n}\n\nfragment HacktivityItemDisclosed on Disclosed {\n  id\n  reporter {\n    id\n    username\n    ...UserLinkWithMiniProfile\n    __typename\n  }\n  team {\n    handle\n    name\n    medium_profile_picture: profile_picture(size: medium)\n    url\n    id\n    ...TeamLinkWithMiniProfile\n    __typename\n  }\n  report {\n    id\n    databaseId: _id\n    title\n    substate\n    url\n    __typename\n  }\n  latest_disclosable_action\n  latest_disclosable_activity_at\n  total_awarded_amount\n  severity_rating\n  currency\n  __typename\n}\n\nfragment HacktivityItemHackerPublished on HackerPublished {\n  id\n  reporter {\n    id\n    username\n    ...UserLinkWithMiniProfile\n    __typename\n  }\n  team {\n    id\n    handle\n    name\n    medium_profile_picture: profile_picture(size: medium)\n    url\n    ...TeamLinkWithMiniProfile\n    __typename\n  }\n  report {\n    id\n    url\n    title\n    substate\n    __typename\n  }\n  latest_disclosable_activity_at\n  severity_rating\n  __typename\n}\n" },
        json: true
    }

    let data = await new Promise(function (resolve, reject) {
        request(o)
            .then((data) => {
                // console.log(data)
                resolve(data);
            })
            .catch(() => reject(undefined))
    })
    let list = []
    data.data.hacktivity_items.edges.forEach(i => {
        list.push({
            id: i.node.databaseId,
            title: i.node.report.title,
            url: i.node.report.url,
            reporter: i.node.reporter.username,
            program: {
                name:i.node.team.name,
                url:i.node.team.url
            },
            total_awarded_amount: i.node.total_awarded_amount,
            severity_rating: i.node.severity_rating,
            latest_disclosable_activity_at: i.node.latest_disclosable_activity_at
        })
    });
    data = {
        total_count: data.data.hacktivity_items.total_count,
        items: list,
    }
    return data
}

// async function main() {
//     console.log(await HackerOne());
// }

// main()
module.exports = HackerOne
