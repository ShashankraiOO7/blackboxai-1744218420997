const Joi = require('joi');

const passwordComplexity = {
    min: 8,
    max: 30,
    lowerCase: 1,
    upperCase: 1,
    numeric: 1,
    symbol: 1,
    requirementCount: 4
};

const credentialsSchema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    password: Joi.string()
        .min(passwordComplexity.min)
        .max(passwordComplexity.max)
        .pattern(new RegExp(`^(?=(.*[a-z]){${passwordComplexity.lowerCase},})(?=(.*[A-Z]){${passwordComplexity.upperCase},})(?=(.*[0-9]){${passwordComplexity.numeric},})(?=(.*[!@#$%^&*()\-__+.]){${passwordComplexity.symbol},}).{${passwordComplexity.min},}$`))
        .required()
        .messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
        })
});

const journeySchema = Joi.object({
    from: Joi.string().min(3).required(),
    to: Joi.string().min(3).required(),
    date: Joi.string().pattern(/^\d{2}\/\d{2}\/\d{4}$/).required(),
    trainNumber: Joi.string().allow('')
});

const passengerSchema = Joi.object({
    name: Joi.string().required(),
    age: Joi.number().integer().min(1).max(120).required(),
    gender: Joi.string().valid('M', 'F', 'O').required(),
    berth: Joi.string().valid('LB', 'UB', 'SL', 'SU').required()
});

const emailSchema = Joi.object({
    service: Joi.string().required(),
    auth: Joi.object({
        user: Joi.string().required(),
        pass: Joi.string().required()
    }).required(),
    from: Joi.string().email().required()
});

const optionsSchema = Joi.object({
    multiTab: Joi.boolean().default(false),
    maxRetries: Joi.number().integer().min(1).max(10).default(5),
    notifications: Joi.boolean().default(true)
});

function validateBookingConfig(config) {
    const { error: credError } = credentialsSchema.validate(config.credentials);
    if (credError) return { valid: false, error: `Credentials: ${credError.message}` };

    const { error: journeyError } = journeySchema.validate(config.journey);
    if (journeyError) return { valid: false, error: `Journey: ${journeyError.message}` };

    const { error: passengersError } = Joi.array().items(passengerSchema).validate(config.passengers);
    if (passengersError) return { valid: false, error: `Passengers: ${passengersError.message}` };

    const { error: optionsError } = optionsSchema.validate(config.options || {});
    if (optionsError) return { valid: false, error: `Options: ${optionsError.message}` };

    return { valid: true };
}

module.exports = {
    validateBookingConfig
};
