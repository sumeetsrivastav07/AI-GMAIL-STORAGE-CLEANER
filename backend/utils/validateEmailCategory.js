import EMAIL_CATEGORIES from "../constants/emailCategories.js";

const validateEmailCategory = (category) => {
    const validCategories = Object.values(EMAIL_CATEGORIES);

    return validCategories.includes(category)
        ? category
        : EMAIL_CATEGORIES.OTHER;
};

export default validateEmailCategory;