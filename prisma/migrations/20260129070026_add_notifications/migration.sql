-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target_audience" TEXT NOT NULL,
    "delivery_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "delivery_rate" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "adminId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "delivery_id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "delivery_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "error_message" TEXT,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("delivery_id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "user_notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("user_notification_id")
);

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "Notification"("notification_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "Notification"("notification_id") ON DELETE RESTRICT ON UPDATE CASCADE;
