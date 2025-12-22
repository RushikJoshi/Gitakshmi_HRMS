/**
 * Formats a given date string or Date object to 'DD-MM-YYYY' format.
 * @param {string|Date} date - The date to format.
 * @returns {string} - Date formatted as 'DD-MM-YYYY'.
 */
export const formatDateDDMMYYYY = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}-${month}-${year}`;
};
