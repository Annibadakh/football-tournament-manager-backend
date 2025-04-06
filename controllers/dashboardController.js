const Tournament = require("../models/tournament");

exports.getDashboard = async (req, res) => {
    try{
      const url = await Tournament.findAll({
        attributes: ["logoUrl", "name"],
      })
      res.status(201).json({
        message: `Welcome, ${req.user.role} to the dashboard`,
        logourl: url
      });
    } catch (error) {
      res.status(500).json({error: "error occur"});
    }
  };
  