const mongoose = require('mongoose');

const getModels = (req) => ({
    Notification: req.tenantDB.model('Notification'),
    LeaveRequest: req.tenantDB.model('LeaveRequest'),
    Regularization: req.tenantDB.model('Regularization'),
});

// Create a new notification (Internal helper)
exports.createNotification = async (req, {
    receiverId,
    receiverRole,
    entityType,
    entityId,
    title,
    message
}) => {
    try {
        const { Notification } = getModels(req);

        const notification = new Notification({
            tenant: req.tenantId,
            receiverId,
            receiverRole,
            entityType,
            entityId,
            title,
            message
        });

        await notification.save();
        return notification;
    } catch (error) {
        console.error("Failed to create notification:", error);
        return null;
    }
};

// Get notifications for the logged-in user (Secure)
exports.getNotifications = async (req, res) => {
    try {
        const { Notification } = getModels(req);

        // STRICT RULE: Backend MUST filter by receiverId + receiverRole + tenant
        // Never allow one user to see another's notifications.
        const query = {
            tenant: req.tenantId,
            receiverId: req.user.id,
            receiverRole: req.user.role
        };

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

        res.json({
            notifications,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get all requests and notifications for the user (Secure)
exports.getMyRequests = async (req, res) => {
    try {
        const { LeaveRequest, Regularization, Notification } = getModels(req);
        const userId = req.user.id;
        const tenantId = req.tenantId;

        // FETCH ONLY OWN DATA (STRICT ISOLATION)
        const leaves = await LeaveRequest.find({
            tenant: tenantId,
            employee: userId
        }).sort({ createdAt: -1 });

        const regularizations = await Regularization.find({
            tenant: tenantId,
            employee: userId
        }).sort({ createdAt: -1 });

        const notifications = await Notification.find({
            tenant: tenantId,
            receiverId: userId,
            receiverRole: req.user.role
        }).sort({ createdAt: -1 }).limit(50);

        res.json({
            leaves,
            regularizations,
            notifications
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mark as read (Secure)
exports.markAsRead = async (req, res) => {
    try {
        const { Notification } = getModels(req);
        const { id } = req.params;

        // Ensure user ONLY updates their own notification
        const notification = await Notification.findOne({
            _id: id,
            tenant: req.tenantId,
            receiverId: req.user.id,
            receiverRole: req.user.role
        });

        if (!notification) return res.status(403).json({ error: "Access denied or notification not found" });

        notification.isRead = true;
        notification.readAt = new Date();
        await notification.save();

        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mark ALL as read (Secure)
exports.markAllAsRead = async (req, res) => {
    try {
        const { Notification } = getModels(req);

        await Notification.updateMany(
            {
                tenant: req.tenantId,
                receiverId: req.user.id,
                receiverRole: req.user.role,
                isRead: false
            },
            { $set: { isRead: true, readAt: new Date() } }
        );

        res.json({ message: "All marked as read" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

