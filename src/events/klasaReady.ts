import { Event } from "klasa";
import { botEnv, topGGAPIKey } from "../config/keys";
import redis from "redis";
import bluebird from "bluebird";
import DBL from "dblapi.js";

bluebird.promisifyAll(redis.RedisClient.prototype);
const redisClient: any = redis.createClient();

module.exports = class extends Event {
  async run() {
    this.client.user.setActivity("Cultured Anime", { type: "WATCHING" });
    this.client.settings.update(
      "supportServerInviteLink",
      "https://discord.gg/JGsgBsN"
    );

    if (botEnv === "production") {
      //-> Set Server count on Top.gg
      new DBL(topGGAPIKey, this.client);
    }

    //-> Delete Any active games that might be cached
    await redisClient.delAsync("active_games");
    await redisClient.delAsync("mafia_games");

    //-> Scheduling Tasks
    if (!this.client.schedule.tasks.find((task) => task.taskName === "petsats"))
      this.client.schedule.create("petstats", "0 * * * *");

    if (
      !this.client.schedule.tasks.find((task) => task.taskName === "checkedIn")
    )
      this.client.schedule.create("checkedIn", "0 0 * * *");

    if (!this.client.schedule.tasks.find((task) => task.taskName === "deposit"))
      this.client.schedule.create("deposit", "0 0 * * *");

    if (
      !this.client.schedule.tasks.find(
        (task) => task.taskName === "premiumDays"
      )
    )
      this.client.schedule.create("premiumDays", "0 0 * * *");

    if (!this.client.schedule.tasks.find((task) => task.taskName === "petage"))
      this.client.schedule.create("petage", "0 0 * * *");
  }
};
