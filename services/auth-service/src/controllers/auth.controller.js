const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// ── Helper: generate tokens ────────────────────────────────────────────────
const generateTokens = (user) => {
  const payload = { userId: user.user_id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 3600,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN) || 604800, // 7 days
  });

  return { accessToken, refreshToken };
};

// ── POST /auth/register ────────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role, station_id } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password and role are required' });
    }

    // Check if email already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({ name, email, password_hash, role, station_id });

    return res.status(201).json({
      userId: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Register error:', error.message);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

// ── POST /auth/login ───────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    const { accessToken, refreshToken } = generateTokens(user);

    return res.status(200).json({
      accessToken,
      refreshToken,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 3600,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// ── POST /auth/refresh-token ───────────────────────────────────────────────
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Make sure user still exists and is active
    const user = await User.findOne({ where: { user_id: decoded.userId, is_active: true } });
    if (!user) {
      return res.status(401).json({ message: 'User not found or deactivated' });
    }

    const tokens = generateTokens(user);

    return res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: parseInt(process.env.JWT_EXPIRES_IN) || 3600,
    });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// ── GET /auth/profile ──────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { user_id: req.user.userId, is_active: true },
      attributes: { exclude: ['password_hash'] },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Profile error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── GET /auth/users ────────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ── PUT /auth/users/:id/role ───────────────────────────────────────────────
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.update({ role });
    return res.status(200).json({ message: 'Role updated', userId: id, role });
  } catch (error) {
    console.error('Update role error:', error.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, refreshToken, getProfile, getAllUsers, updateRole };
