// Imports
import express, { Application, Request, Response, NextFunction } from 'express';
import { KlasaClient } from 'klasa';
import redis from 'redis';
import bluebird from 'bluebird';
import moment from 'moment';

// Init
const api = express.Router();
bluebird.promisifyAll(redis.RedisClient.prototype);
const redisClient: any = redis.createClient();

// Globals
const version = 1.0;

module.exports = (app: Application, client: KlasaClient) => {
  // Middlewares
  api.use(
    ['/guilds*'],
    async (req: Request, res: Response, next: NextFunction) => {
      const token = req.headers.authorization;

      // No Token
      if (!token)
        return res.status(401).json({ code: 401, error: 'No token provided' });

      // Token not found
      if (!(await redisClient.hexistsAsync('auth_tokens_v1', token)))
        return res.status(401).json({ code: 401, error: 'Invalid Token' });

      // Fetching User
      const userID = await redisClient.hgetAsync('auth_tokens_v1', token);
      const user = client.users.get(userID);

      req['user'] = user;
      next();
    }
  );

  api.use(
    ['/guilds/:id*'],
    async (req: Request, res: Response, next: NextFunction) => {
      // Fetching Guild
      const guild = client.guilds.get(req.params.id);

      if (!guild)
        return res.status(404).json({ code: 404, error: 'No guild found' });

      if (guild.ownerID !== req.user.id)
        return res.status(401).json({ code: 401, error: 'Access Denied' });

      req['guild'] = guild;
      next();
    }
  );

  // Root Route
  api.get('/', (req, res) => {
    return res.json({ active: true });
  });

  // Version
  api.get(['/v', '/ver', '/version'], (req, res) => {
    return res.json({ version: version });
  });

  // Get IDs of all guilds this user is in
  api.get('/guilds', (req, res) => {
    const guildIDs = client.guilds
      .filter(g => g.members.has(req.user.id))
      .array()
      .map(g => g.id);

    return res.json({
      guilds: guildIDs,
    });
  });

  // Get Info of a guild (must be owner)
  api.get('/guilds/:id', (req, res) => {
    return res.json({
      guild: req.guild,
    });
  });

  // Provides Stats of a guild
  // -> Active Now Count
  // -> Growth Rate
  // -> Join Rate
  // ---------------
  // Query Params:
  // growthCycle - number of days to show growthRate for (int)
  // joinRate - number of days to show joinRate for (int)
  api.get('/guilds/:id/stats', (req, res) => {
    const growthRate = [];
    const joinRate = [];

    const growthCycle = parseInt(req.query.growthCycle) || 7;
    const joinCycle = parseInt(req.query.joinCycle) || 7;

    const activeNowCount = req.guild.members.filter(
      m =>
        m.presence.status === 'online' ||
        m.presence.status === 'idle' ||
        m.presence.status === 'dnd'
    ).size;

    for (let i = 0; i < growthCycle; i++) {
      const date = moment().subtract(i, 'days');
      growthRate.push(
        req.guild.members.filter(m =>
          moment(m.joinedAt).isSameOrBefore(date, 'day')
        ).size
      );
    }

    for (let i = 0; i < joinCycle; i++) {
      const date = moment().subtract(i, 'days');
      joinRate.push(
        req.guild.members.filter(m => moment(m.joinedAt).isSame(date, 'day'))
          .size
      );
    }

    return res.json({
      stats: {
        activeNowCount,
        growthRate,
        joinRate,
      },
    });
  });

  // Fetch IDs of Staff members (members with moderation-related permissions)
  api.get('/guilds/:id/staff', (req, res) => {
    const staff = req.guild.members
      .filter(
        m =>
          m.hasPermission('ADMINISTRATOR') ||
          m.hasPermission('MANAGE_GUILD') ||
          m.hasPermission('BAN_MEMBERS') ||
          m.hasPermission('KICK_MEMBERS')
      )
      .array()
      .map(m => m.id);

    return res.json({
      staff,
    });
  });

  // ? Routes to Add:
  // - GET /guilds/:id/members => Return member ids of all the members in a guild
  // - GET /guilds/:id/members/:id => Return info about a member in a guild
  // - POST /guilds/:id/members/:id/kick => Kick the member
  // - POST /guilds/:id/members/:id/ban => Ban the member
  // - GET /guilds/:id/notifications => Return notifications such as reports, Updates, etc
  // - GET /users/:id => Return info about the user (must be the logged in user)
  // - GET /users/:id/token => Returns token for the logged in user alongside QR Code

  app.use('/api/v1', api);
};
