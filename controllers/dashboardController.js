exports.getDashboard = (req, res) => {
    res.json({
      message: `Welcome, ${req.user.role} to the dashboard`,
      user: req.user,
    });
  };
  