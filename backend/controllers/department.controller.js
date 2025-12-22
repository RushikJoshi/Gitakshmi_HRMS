// ----------------------------------------------------------
// GET DEPARTMENTS (Tenant Scoped)
// ----------------------------------------------------------
exports.getDepartments = async (req, res, next) => {
  try {
    const db = req.tenantDB;
    const Department = db.model("Department");
    const Employee = db.model("Employee");

    const items = await Department.find({ tenant: req.tenantId })
      .populate({
        path: "head",
        select: "firstName lastName email",
        model: Employee
      });

    res.json({ success: true, data: items });

  } catch (err) { next(err); }
};

// ----------------------------------------------------------
// CREATE DEPARTMENT (Tenant Scoped)
// ----------------------------------------------------------
exports.createDepartment = async (req, res, next) => {
  try {
    const db = req.tenantDB;
    const Department = db.model("Department");
    const Employee = db.model("Employee");

    const { name, description, head } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50)
      return res.status(400).json({ success: false, message: "Department name must be 2-50 characters" });

    if (description && description.length > 250)
      return res.status(400).json({ success: false, message: "Description must be at most 250 characters" });

    // Duplicate name inside SAME tenant DB
    const exists = await Department.findOne({ name: name.trim(), tenant: req.tenantId });
    if (exists)
      return res.status(400).json({ success: false, message: "Department name already exists" });

    // Check head (must be valid employee in this tenant)
    if (head) {
      const emp = await Employee.findById(head);
      if (!emp)
        return res.status(400).json({ success: false, message: "Department head not found" });
    }

    const item = await Department.create({
      name: name.trim(),
      description: description || "",
      head: head || null,
      tenant: req.tenantId,
      meta: req.body.meta || {}
    });

    res.status(201).json({ success: true, data: item });

  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: "Department name must be unique" });
    next(err);
  }
};

// ----------------------------------------------------------
// UPDATE DEPARTMENT (Tenant Scoped)
// ----------------------------------------------------------
exports.updateDepartment = async (req, res, next) => {
  try {
    const db = req.tenantDB;
    const Department = db.model("Department");
    const Employee = db.model("Employee");

    const { name, description, head } = req.body;
    const id = req.params.id;

    if (name && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50))
      return res.status(400).json({ success: false, message: "Department name must be 2-50 characters" });

    if (description && description.length > 250)
      return res.status(400).json({ success: false, message: "Description must be at most 250 characters" });

    const duplicate = await Department.findOne({
      name: name?.trim(),
      tenant: req.tenantId,
      _id: { $ne: id }
    });

    if (duplicate)
      return res.status(400).json({ success: false, message: "Department name already exists" });

    if (head) {
      const emp = await Employee.findById(head);
      if (!emp)
        return res.status(400).json({ success: false, message: "Department head not found" });
    }

    const item = await Department.findOneAndUpdate(
      { _id: id, tenant: req.tenantId },
      {
        name: name?.trim(),
        description: description || "",
        head: head || null,
        meta: req.body.meta || {}
      },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: item });

  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: "Department name must be unique" });
    next(err);
  }
};

// ----------------------------------------------------------
// DELETE DEPARTMENT (Tenant Scoped)
// ----------------------------------------------------------
exports.deleteDepartment = async (req, res, next) => {
  try {
    const db = req.tenantDB;
    const Department = db.model("Department");

    await Department.findOneAndDelete({ _id: req.params.id, tenant: req.tenantId });

    res.json({ success: true });

  } catch (err) { next(err); }
};
