export function calculateAnnualTax(income){const amount=Math.max(0,Number(income)||0);if(amount<=600000)return 0;if(amount<=1200000)return (amount-600000)*.05;if(amount<=2400000)return 30000+(amount-1200000)*.15;if(amount<=3600000)return 210000+(amount-2400000)*.25;return 510000+(amount-3600000)*.35;}
export const calculateIllustrativeAnnualTax=calculateAnnualTax;
