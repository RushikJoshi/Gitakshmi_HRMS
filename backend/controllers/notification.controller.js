const mongoose = require('mongoose');

const getModels = (req) => {
    if (req.tenantDB) {
        try {
            return {
                Notification: req.tenantDB.model('Notification'),
                LeaveRequest: req.tenantDB.model('LeaveRequest'),
                Regularization: req.tenantDB.model('Regularization'),
            };
        } catch (error) {
            // Models not registered, register them
            console.log(`[NOTIFICATION_CONTROLLER] Registering models in tenant DB`);
            const NotificationSchema = require('../models/Notification');
            const LeaveRequestSchema = require('../models/LeaveRequest');
            const RegularizationSchema = require('../models/Regularization');
            return {
                Notification: req.tenantDB.model('Notification', NotificationSchema),
                LeaveRequest: req.tenantDB.model('LeaveRequest', LeaveRequestSchema),
                Regularization: req.tenantDB.model('Regularization', RegularizationSchema),
            };
        }
    } else {
        // Fallback for super admin or when tenantDB is not set
        return {
            Notification: mongoose.model('Notification'),
            LeaveRequest: mongoose.model('LeaveRequest'),
            Regularization: mongoose.model('Regularization'),
        };
    }
};

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
        console.log(`[NOTIFICATION_CONTROLLER] getNotifications called`);
        console.log(`[NOTIFICATION_CONTROLLER] req.user:`, req.user ? { id: req.user.id, role: req.user.role } : 'null');
        console.log(`[NOTIFICATION_CONTROLLER] req.tenantId:`, req.tenantId || 'null');
        console.log(`[NOTIFICATION_CONTROLLER] req.tenantDB:`, req.tenantDB ? 'present' : 'null');

        // Backend validation: Ensure user is authenticated
        if (!req.user || !req.user.id) {
            console.warn(`[NOTIFICATION_CONTROLLER] Missing user context`);
            return res.status(400).json({ error: 'User authentication required' });
        }

        // For tenant-specific operations, ensure tenantId is available (except for super admin)
        if (!req.tenantId && req.user.role !== 'psa') {
            console.warn(`[NOTIFICATION_CONTROLLER] Missing tenant context for non-super-admin user`);
            return res.status(400).json({ error: 'Tenant context required' });
        }

        console.log(`[NOTIFICATION_CONTROLLER] About to call getModels`);
        const { Notification } = getModels(req);
        console.log(`[NOTIFICATION_CONTROLLER] Got Notification model`);

        // FIX: Super Admin ID ('psa_admin') often fails ObjectId casting.
        // If user ID is not a valid ObjectId, return empty list to prevent CastError.
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
            console.log('[NOTIFICATION_CONTROLLER] User ID is not an ObjectId (likely PSA), returning empty.');
            return res.json({ notifications: [], unreadCount: 0 });
        }

        // STRICT RULE: Backend MUST filter by receiverId + receiverRole + tenant
        // Never allow one user to see another's notifications.
        const query = {
            tenant: req.tenantId,
            receiverId: req.user.id,
            receiverRole: req.user.role
        };

        console.log(`[NOTIFICATION_CONTROLLER] Query:`, query);

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

        console.log(`[NOTIFICATION_CONTROLLER] Found ${notifications.length} notifications, ${unreadCount} unread`);

        res.json({
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error(`[NOTIFICATION_CONTROLLER] Error:`, error);
        res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
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

