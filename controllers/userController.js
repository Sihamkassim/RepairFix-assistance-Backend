// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.auth.userId;
    res.json({ 
      message: 'User authenticated',
      userId: userId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get protected data
export const getProtectedData = async (req, res) => {
  try {
    res.json({ 
      message: 'This is a protected route',
      userId: req.auth.userId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
