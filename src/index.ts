//=====================
//DEPENDENCIES
//=====================
import { Client } from "klasa";
import { Client as Lavaqueue } from "lavaqueue";
import {
  mongoConnectionString,
  discordBotToken,
  lavalinkPassword,
} from "./config/keys";
import mongoose from "mongoose";
import redis from "redis";
import bluebird from "bluebird";
import LavaqueueNode from "lavaqueue/typings/Node";
//=====================

//=====================
//Initialization
//=====================
bluebird.promisifyAll(redis.RedisClient.prototype);
const redisClient: any = redis.createClient();
//=====================

//=====================
//Animu Client
//=====================
class AnimuClient extends Client {
  lVoice: LavaqueueNode;
}
//=====================

//=====================
//SCHEMAS
//=====================
//-> AnimuClient Schema
AnimuClient.defaultClientSchema.add("animuStaff", "User", {
  array: true,
  default: [],
});
AnimuClient.defaultClientSchema.add("supportServerInviteLink", "String");
AnimuClient.defaultClientSchema.add("checkInViews", "number", { default: 0 });

//-> Guild Schema
AnimuClient.defaultGuildSchema.add("defaultVolume", "number", {
  default: 50,
  min: 1,
  max: 100,
});
/* Level Settings */
AnimuClient.defaultGuildSchema.add("enableLevels", "bool", {
  default: true,
});
AnimuClient.defaultGuildSchema.add("expRate", "number", {
  default: 1,
  min: 0.1,
  max: 10,
});
AnimuClient.defaultGuildSchema.add("expTime", "number", {
  default: 3,
  min: 1,
  max: 60,
});
AnimuClient.defaultGuildSchema.add("ignoreExpChannels", "channel", {
  array: true,
});
AnimuClient.defaultGuildSchema.add("ignoreLevelRoles", "role", { array: true });
AnimuClient.defaultGuildSchema.add("allowExpBottles", "bool", {
  default: true,
});

/* Roles */
AnimuClient.defaultGuildSchema.add("djRole", "role");
AnimuClient.defaultGuildSchema.add("verifiedRole", "role");
AnimuClient.defaultGuildSchema.add("mutedRole", "role");

/* Reputation */
AnimuClient.defaultGuildSchema.add("enableReputation", "bool", {
  default: true,
});
AnimuClient.defaultGuildSchema.add("startingRep", "number", { default: 50 });
AnimuClient.defaultGuildSchema.add("banOnLowRep", "bool");
AnimuClient.defaultGuildSchema.add("ignoreRepRoles", "role", { array: true });

/* Self Roles */
AnimuClient.defaultGuildSchema.add("selfRolesChannel", "textchannel");
AnimuClient.defaultGuildSchema.add("selfRolesMessage", "string");

/* Welcome */
AnimuClient.defaultGuildSchema.add("enableWelcomeMessage", "bool");
AnimuClient.defaultGuildSchema.add("welcomeChannel", "textchannel");
AnimuClient.defaultGuildSchema.add("welcomeMessage", "string");
AnimuClient.defaultGuildSchema.add("welcomeImageURL", "string");
AnimuClient.defaultGuildSchema.add("joinRoles", "role", { array: true });

/* Toxicity Filters */
AnimuClient.defaultGuildSchema.add("deleteToxicMessages", "bool");
AnimuClient.defaultGuildSchema.add("toxicityFilters", (folder) => {
  folder.add("toxicity", "bool");
  folder.add("severeToxicity", "bool");
  folder.add("insult", "bool");
  folder.add("profanity", "bool");
  folder.add("identityAttack", "bool");
  folder.add("sexuallyExplicit", "bool");
  folder.add("flirtation", "bool");
  folder.add("threat", "bool");
});

/* Notifications */
AnimuClient.defaultGuildSchema.add("notifications", (folder) => {
  folder.add("staffMemberLeft", "bool", { default: true });
  folder.add("report", "bool", { default: true });
});

/* Logs */
AnimuClient.defaultGuildSchema.add("logChannels", (folder) => {
  folder.add("reputationEdits", "textchannel");
  folder.add("deletedMessages", "textchannel");
  folder.add("editedMessages", "textchannel");
  folder.add("reports", "textchannel");
});

/* Misc */
AnimuClient.defaultGuildSchema.add("deleteMessagesChannels", "textchannel", {
  array: true,
});

//-> User Schema
AnimuClient.defaultUserSchema.add("TODOs", "any", { array: true });
//=====================

//=====================
//INIT
//=====================

//-> Klasa AnimuClient
AnimuClient.defaultPermissionLevels
  .add(
    5,
    ({ guild, member }) => guild && member.permissions.has("MANAGE_ROLES"),
    { fetch: true }
  )
  .add(8, ({ client, author }) =>
    client.settings.get("animuStaff").includes(author.id)
  );
//-> Mongoose
mongoose
  .connect(mongoConnectionString, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    //->Creating models
    require("./models/Inventory");
    require("./models/Profile");
    require("./models/Item");
    require("./models/Pet");
    require("./models/SelfRole");
    require("./models/Log");
    require("./models/Guild");
    require("./models/BankAccount");
    require("./models/Notification");

    //-> Klasa AnimuClient
    const client = new AnimuClient({
      fetchAllMembers: false,
      prefix: "-",
      commandEditing: true,
      noPrefixDM: true,
      providers: {
        default: "mongodb",
        mongodb: {
          connectionString: mongoConnectionString,
        },
      },
      owners: [
        "556455046217203752", //Lily
        "338334949331697664", //Light Yagami
        "510715931572305920", //Misaki
      ],
      partials: ["MESSAGE"],
      readyMessage: () => "Bot ready",
    });

    await client.login(discordBotToken);

    //-> Routing
    require("./routes/routes")(client);

    //-> Adding Lavalink
    client.lVoice = new Lavaqueue({
      password: lavalinkPassword,
      userID: client.user.id,
      hosts: {
        rest: "http://localhost:2333",
        ws: "http://localhost:2333",
        redis: "localhost:6379",
      },
      send(guildID, packet) {
        if (client.guilds.has(guildID))
          return client.guilds.get(guildID).shard.send(packet);
        throw new Error("attempted to send a packet on the wrong shard");
      },
    });

    //-> Lavalink Packets
    client.on("raw", (pk: { t: string; d: any }) => {
      if (pk.t === "VOICE_STATE_UPDATE") client.lVoice.voiceStateUpdate(pk.d);
      if (pk.t === "VOICE_SERVER_UPDATE") client.lVoice.voiceServerUpdate(pk.d);
    });

    //-> Music Queue hanling
    client.lVoice.on(
      "event",
      async (d: {
        op: string;
        reason: string;
        type: string;
        track?: string;
        guildId: string;
        code?: number;
        byRemote?: boolean;
      }) => {
        if (d.type === "TrackEndEvent") {
          redisClient.delAsync(`skip_votes:${d.guildId}`);

          const looping = await redisClient.sismemberAsync(
            "loop_guilds",
            d.guildId
          );

          if (looping) {
            await client.lVoice.queues.get(d.guildId).add(d.track);
          }

          const allTracks = await client.lVoice.queues.get(d.guildId).tracks();

          if (!looping && allTracks.length === 0)
            await client.lVoice.queues.get(d.guildId).player.leave();
        }
      }
    );
  })
  .catch((e) => {
    console.log(e);
  });
//=====================
