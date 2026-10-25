export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
  maxAge: 8 * 60 * 60 * 1000,
};
export const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role });
export const readCookie = (req, name) => { const value = req.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`)); return value ? decodeURIComponent(value.slice(name.length + 1)) : null; };
