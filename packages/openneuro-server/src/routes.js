// dependencies ------------------------------------

import express from 'express'
import * as users from './handlers/users'
import * as datalad from './handlers/datalad'
import * as comments from './handlers/comments'
import { clientConfig } from './handlers/config.js'
import * as subscriptions from './handlers/subscriptions'
import {
  setFlagRedesign2021,
  unsetFlagRedesign2021,
} from './handlers/feature-flags'
import verifyUser from './libs/authentication/verifyUser.js'
import * as google from './libs/authentication/google.js'
import * as orcid from './libs/authentication/orcid.js'
import * as jwt from './libs/authentication/jwt.js'
import * as auth from './libs/authentication/states.js'
import * as doi from './handlers/doi'
import { sitemapHandler } from './handlers/sitemap.js'
import { reviewerHandler } from './handlers/reviewer'

const noCache = (req, res, next) => {
  res.setHeader('Surrogate-Control', 'no-store')
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate',
  )
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  next()
}

const routes = [
  // Health check --------------------------------
  {
    method: 'get',
    url: '/',
    handler: (req, res) => {
      res.sendStatus(200)
    },
  },
  // React config --------------------------------
  {
    method: 'get',
    url: '/config.json',
    handler: clientConfig,
  },
  // users ---------------------------------------
  {
    method: 'get',
    url: '/users/self',
    middleware: [noCache, jwt.authenticate, auth.authenticated],
    handler: verifyUser,
  },

  // comments --------------------------------------

  {
    method: 'post',
    url: '/comments/reply/:commentId/:userId',
    handler: comments.reply,
  },

  // subscriptions ----------------------------------------

  {
    method: 'get',
    url: '/subscriptions/:datasetId',
    handler: subscriptions.getSubscriptions,
  },
  {
    method: 'get',
    url: '/subscriptions/:datasetId/:userId',
    middleware: [noCache],
    handler: subscriptions.checkUserSubscription,
  },
  {
    method: 'post',
    url: '/subscriptions/:datasetId',
    middleware: [jwt.authenticate, auth.authenticated],
    handler: subscriptions.create,
  },
  {
    method: 'delete',
    url: '/subscriptions/:datasetId/:userId',
    middleware: [jwt.authenticate, auth.authenticated],
    handler: subscriptions.deleteSubscription,
  },
  {
    method: 'delete',
    url: '/subscriptions/:datasetId',
    middleware: [jwt.authenticate, auth.authenticated],
    handler: subscriptions.deleteAll,
  },

  // dataset doi ----------------------------------------
  {
    method: 'post',
    url: '/doi/:datasetId/:snapshotId',
    middleware: [jwt.authenticate, auth.authenticated],
    handler: doi.createSnapshotDoi,
  },
  {
    method: 'get',
    url: '/doi/:datasetId/:snapshotId',
    handler: doi.getDoi,
  },

  // generate CLI API keys ------------------------------
  {
    method: 'post',
    url: '/keygen',
    middleware: [noCache, jwt.authenticate, auth.authenticated],
    handler: users.createAPIKey,
  },

  // file routes
  {
    method: 'get',
    url: '/datasets/:datasetId/files/:filename',
    handler: datalad.getFile,
  },
  {
    method: 'get',
    url: '/datasets/:datasetId/snapshots/:snapshotId/files/:filename',
    handler: datalad.getFile,
  },

  // Authentication routes

  // google
  {
    method: 'get',
    url: '/auth/google',
    middleware: [noCache],
    handler: google.requestAuth,
  },
  {
    method: 'get',
    url: '/auth/google/callback',
    middleware: [noCache, google.authCallback],
    handler: jwt.authSuccessHandler,
  },

  // orcid
  {
    method: 'get',
    url: '/auth/orcid',
    middlware: [noCache],
    handler: orcid.requestAuth,
  },
  {
    method: 'get',
    url: '/auth/orcid/callback',
    middleware: [noCache, orcid.authCallback],
    handler: jwt.authSuccessHandler,
  },
  // Anonymous reviewer access
  {
    method: 'get',
    url: '/reviewer/:token',
    middleware: [noCache],
    handler: reviewerHandler,
  },
  // sitemap
  {
    method: 'get',
    url: '/sitemap',
    handler: sitemapHandler,
  },
  // feature flag setters and unsetters
  {
    method: 'get',
    url: '/feature/redesign-2021/enable',
    handler: unsetFlagRedesign2021,
  },
  {
    method: 'get',
    url: '/feature/redesign-2021/disable',
    handler: setFlagRedesign2021,
  },
]

// initialize routes -------------------------------

const router = express.Router()

for (const route of routes) {
  const arr = route.hasOwnProperty('middleware') ? route.middleware : []
  arr.unshift(route.url)
  arr.push(route.handler)
  router[route.method](...arr)
}

// export ------------------------------------------

export default router
