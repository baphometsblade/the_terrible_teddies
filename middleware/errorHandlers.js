const handleErrors = (error, req, res, next) => {
  console.error(`Error occurred: ${error.message}`);
  console.error(error.stack);
  res.status(500).send('An error occurred while processing your request.');
};

module.exports = {
  handleErrors
};