const fetch = require('node-fetch');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    let response = '';
    await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${process.env['GITHUB_AUTH_TOKEN']}`
        },
        body: JSON.stringify({query: "{ rateLimit { cost }}"})
    })
    .then(r => r.json())
    .then(data => context.log(data));

    if (req.query.name || (req.body && req.body.name)) {
        context.res = {
            body: {
                "text": "HHHHEEEEYYYY"
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    else {
        context.res = {
            status: 400,
            body: "Please pass a name on the query string or in the request body"
        };
    }
};