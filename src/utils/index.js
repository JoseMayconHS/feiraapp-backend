exports.optionsCounted = [{
  $group: {
    _id: null,
    count: { $sum: 1 }
  }
}, {
  $project: {
    _id: 0,
    count: 1
  }
}]
