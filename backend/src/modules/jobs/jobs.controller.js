
// ─── jobs.controller.js ─────────────────────────────────────
const jobsService = require('./jobs.service');
const { asyncHandler } = require('../../utils/asyncHandler');

module.exports = {
  listJobs: asyncHandler(async (req, res) => {
    const { status, category, city, page, limit } = req.query;
    const employerId = req.query.mine ? req.user.id : undefined;
    const result = await jobsService.listJobs({ status, category, city, page, limit, employerId });
    res.json(result);
  }),

  getNearbyJobs: asyncHandler(async (req, res) => {
    const { lat, lng, radius, category, page, limit } = req.query;
    const jobs = await jobsService.getNearbyJobs({
      lat: parseFloat(lat), lng: parseFloat(lng),
      radius: radius ? parseInt(radius) : undefined,
      category, page, limit
    });
    res.json({ jobs, count: jobs.length });
  }),

  getJob: asyncHandler(async (req, res) => {
    const job = await jobsService.getJob(req.params.id, req.user.id);
    res.json(job);
  }),

  createJob: asyncHandler(async (req, res) => {
    const job = await jobsService.createJob(req.body, req.user.id);
    res.status(201).json(job);
  }),

  updateJob: asyncHandler(async (req, res) => {
    const job = await jobsService.updateJob(req.params.id, req.body, req.user.id, req.user.role);
    res.json(job);
  }),

  deleteJob: asyncHandler(async (req, res) => {
    const result = await jobsService.deleteJob(req.params.id, req.user.id, req.user.role);
    res.json(result);
  })
};