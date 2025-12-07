import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        backgroundColor: (theme) => theme.palette.grey[100],
        borderTop: 1,
        borderColor: 'divider',
        position: 'sticky',
        bottom: 0,
        zIndex: 1,
        width: '100%'
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ fontSize: '0.875rem' }}
        >
          © {new Date().getFullYear()} deviceCheck. All rights reserved.
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
