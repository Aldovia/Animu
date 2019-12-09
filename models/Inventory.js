const { Schema, model } = require('mongoose');

const inventorySchema = new Schema({
  memberID: {
    type: String,
    unique: true,
  },
  coins: Number,
  inventory: [String],
  checkedIn: Boolean,
});

inventorySchema.methods.addCoins = async function(amount) {
  this.coins += amount;

  await this.save();
  return true;
***REMOVED***

inventorySchema.methods.giveItem = async function(itemName) {
  this.inventory.push(itemName);

  await this.save();
  return true;
***REMOVED***

inventorySchema.methods.deductCoins = async function(amount) {
  this.coins -= amount;

  await this.save();
  return true;
***REMOVED***

inventorySchema.methods.takeItem = async function(itemName) {
  const index = this.inventory.indexOf(itemName);

  if (index < 0) return false;

  this.inventory.splice(index, 1);

  await this.save();
  return true;
***REMOVED***

inventorySchema.methods.checkIn = async function() {
  this.coins += 30;
  this.checkedIn = true;

  await this.save();
  return true;
***REMOVED***

model('Inventory', inventorySchema);
