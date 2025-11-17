const { validationResult } = require('express-validator');

const formatErrors = (errors) => {
  return errors.array().map((err) => ({
    field: err.param,
    message: err.msg,
    value: err.value,
  }));
};

const validate = (validators) => async (req, res, next) => {
  await Promise.all(validators.map((validator) => validator.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'اطلاعات وارد شده صحیح نیست',
      errors: formatErrors(errors),
    });
  }

  return next();
};

module.exports = {
  validate,
};

