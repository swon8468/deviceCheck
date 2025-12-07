import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Typography
} from '@mui/material';

const SortableTable = ({ 
  data, 
  columns, 
  renderRow, 
  defaultSortColumn = 0,
  defaultSortDirection = 'asc',
  sx = {},
  ...props 
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: columns[defaultSortColumn]?.key || columns[0]?.key,
    direction: defaultSortDirection
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, 'ko-KR');
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue), 'ko-KR');
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  return (
    <TableContainer component={Paper} sx={sx} {...props}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column, index) => (
              <TableCell
                key={column.key || index}
                align={column.align || 'left'}
                sx={{
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': {
                    backgroundColor: '#e0e0e0'
                  }
                }}
                onClick={() => handleSort(column.key)}
              >
                <TableSortLabel
                  active={sortConfig.key === column.key}
                  direction={sortConfig.key === column.key ? sortConfig.direction : 'asc'}
                >
                  {column.label}
                </TableSortLabel>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((row, index) => renderRow(row, index))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SortableTable;
