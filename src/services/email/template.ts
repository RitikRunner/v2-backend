export function otpEmailTemplate(otp: string, ttlSeconds: number) {
  const minutes = Math.round(ttlSeconds / 60);
  return {
    subject: "Your Stunning Dentistry login code",
    text: `Your login code is ${otp}. It expires in ${minutes} minutes.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
      <h2>Stunning Dentistry</h2>
      <p>Your login code:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${otp}</p>
      <p>Expires in ${minutes} minutes.</p>
    </div>`,
  };
}
