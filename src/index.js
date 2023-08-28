/**
 * Required External Modules
 */

const express = require('express');
const path = require('path');
const { auth, requiresAuth  } = require('express-openid-connect');

require("dotenv").config();

/**
 * App Variables
 */

const env = process.env.NODE_ENV || "development";
const app = express();
const port =
  env === "development" ? process.env.DEV_PORT : process.env.PROD_PORT;

/**
 *  App Configuration
 */

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  auth({
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    baseURL: process.env.BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    secret: process.env.SESSION_SECRET,
    authRequired: false,
    auth0Logout: true,
    clientSecret: process.env.CLIENT_SECRET,
    authorizationParams: {
      response_type: "code",
      audience: process.env.AUTH0_AUDIENCE,
    },
  })
);

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.oidc.isAuthenticated();
  res.locals.activeRoute = req.originalUrl;
  next();
});

/**
 * Routes Definitions
 */

// > Home

app.get('/', (req, res) => {
  res.render('home');
});

// > Profile

app.get('/profile', requiresAuth(), (req, res) => {
  res.render('profile', {
    user: req.oidc.user,
    accessToken: req.oidc.accessToken
  });
});

// > External API

app.get('/external-api', (req, res) => {
  res.render('external-api');
});

app.get('/external-api/public-message', async (req, res) => {
  let message;

  try {
    const gotModule = await import('got');
    const got = gotModule.default; // Accessing the default export
    const body = await got(
      `${process.env.SERVER_URL}/api/messages/public-message`,
    ).json();

    message = body.message;
  } catch (e) {
    console.log(e);
    message = 'Unable to retrieve message.';
  }

  res.render('external-api', { message });
});

app.get('/external-api/protected-message', requiresAuth(), async (req, res) => {
  const { token_type, access_token } = req.oidc.accessToken;
  let message;

  try {
    const gotModule = await import('got');
    const got = gotModule.default; // Accessing the default export
    const body = await got(
      `${process.env.SERVER_URL}/api/messages/protected-message`,
      {
        headers: {
          Authorization: `${token_type} ${access_token}`,
        },
      },
    ).json();

    message = body.message;
  } catch (e) {
    message = 'Unable to retrieve message.';
  }

  res.render('external-api', { message });
});

// > Authentication

app.get('/sign-up/:page', (req, res) => {
  const { page } = req.params;

  res.oidc.login({
    returnTo: page,
    authorizationParams: {
      screen_hint: 'signup',
    },
  });
});

app.get('/login/:page', (req, res) => {
  const { page } = req.params;

  res.oidc.login({
    returnTo: page,
  });
});

app.get('/logout/:page', (req, res) => {
  const { page } = req.params;

  res.oidc.logout({
    returnTo: page,
  });
});

/**
 * Server Activation
 */

app.listen(port, () => {
  console.log(`Listening to requests on http://localhost:${port}`);
});
