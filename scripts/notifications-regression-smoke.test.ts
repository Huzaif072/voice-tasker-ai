import { parseNotificationId } from "../lib/notifications/ids";

const validId = parseNotificationId("507f1f77bcf86cd799439011");
if (!validId || validId.toHexString() !== "507f1f77bcf86cd799439011") {
  throw new Error("A valid MongoDB notification ID should be converted to ObjectId");
}

if (parseNotificationId("not-an-object-id") !== null) {
  throw new Error("An invalid notification ID should be rejected");
}

if (parseNotificationId(undefined) !== null || parseNotificationId(123) !== null) {
  throw new Error("Non-string notification IDs should be rejected");
}

console.log("PASS: notification IDs are validated before MongoDB updates.");
