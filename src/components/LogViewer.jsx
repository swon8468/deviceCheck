import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const LogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    majorCategory: '',
    middleCategory: '',
    minorCategory: '',
    userRole: '',
    action: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const logsRef = collection(db, 'system_logs');
      const q = query(logsRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const logsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().timestamp)
      }));
      
      setLogs(logsData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (filters.majorCategory) {
      filtered = filtered.filter(log => log.majorCategory === filters.majorCategory);
    }
    if (filters.middleCategory) {
      filtered = filtered.filter(log => log.middleCategory === filters.middleCategory);
    }
    if (filters.minorCategory) {
      filtered = filtered.filter(log => log.minorCategory === filters.minorCategory);
    }
    if (filters.userRole) {
      filtered = filtered.filter(log => log.userRole === filters.userRole);
    }
    if (filters.action) {
      filtered = filtered.filter(log => log.action.includes(filters.action));
    }
    if (filters.startDate) {
      filtered = filtered.filter(log => log.timestamp >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filtered = filtered.filter(log => log.timestamp <= new Date(filters.endDate + 'T23:59:59'));
    }

    setFilteredLogs(filtered);
  };

  const getCategoryColor = (category) => {
    const colors = {
      '사용자 관리': 'primary',
      '클래스 관리': 'secondary',
      '학생 관리': 'success',
      '상벌점 관리': 'warning',
      '시스템': 'error',
      '데이터 관리': 'info'
    };
    return colors[category] || 'default';
  };

  const getActionColor = (action) => {
    if (action.includes('생성') || action.includes('추가')) return 'success';
    if (action.includes('수정')) return 'warning';
    if (action.includes('삭제')) return 'error';
    if (action.includes('조회')) return 'info';
    return 'default';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 고유한 카테고리 값들 추출
  const majorCategories = [...new Set(logs.map(log => log.majorCategory))].filter(Boolean);
  const middleCategories = [...new Set(logs.map(log => log.middleCategory))].filter(Boolean);
  const minorCategories = [...new Set(logs.map(log => log.minorCategory))].filter(Boolean);
  const userRoles = [...new Set(logs.map(log => log.userRole))].filter(Boolean);

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100%',
      minWidth: '100%'
    }}>
      
      {/* 필터 */}
      <Paper sx={{ 
        p: 2, 
        mb: 2, 
        width: '100%',
        maxWidth: '100%'
      }}>
        <Typography variant="h6" gutterBottom>필터</Typography>
        <Grid container spacing={2} sx={{ width: '100%' }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth sx={{ minWidth: '150px' }}>
              <InputLabel>중분류</InputLabel>
              <Select
                value={filters.middleCategory}
                onChange={(e) => setFilters({...filters, middleCategory: e.target.value})}
                size="small"
                label="중분류"
              >
                <MenuItem value="">전체</MenuItem>
                {middleCategories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth sx={{ minWidth: '150px' }}>
              <InputLabel>소분류</InputLabel>
              <Select
                value={filters.minorCategory}
                onChange={(e) => setFilters({...filters, minorCategory: e.target.value})}
                size="small"
                label="소분류"
              >
                <MenuItem value="">전체</MenuItem>
                {minorCategories.map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="작업 내용 검색"
              value={filters.action}
              onChange={(e) => setFilters({...filters, action: e.target.value})}
              placeholder="생성, 수정, 삭제 등"
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="시작 날짜"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="종료 날짜"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* 로그 테이블 */}
      <div className="table-scroll-container">
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: '900px' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: '120px', whiteSpace: 'nowrap' }}>시간</TableCell>
                <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>사용자</TableCell>
                <TableCell sx={{ minWidth: '80px', whiteSpace: 'nowrap' }}>역할</TableCell>
                <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>대분류</TableCell>
                <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>중분류</TableCell>
                <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>소분류</TableCell>
                <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>작업</TableCell>
                <TableCell sx={{ minWidth: '200px', whiteSpace: 'nowrap' }}>상세 내용</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">로딩 중...</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">로그가 없습니다.</TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell sx={{ minWidth: '120px', whiteSpace: 'nowrap' }}>{formatDate(log.timestamp)}</TableCell>
                    <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>{log.userName}</TableCell>
                    <TableCell sx={{ minWidth: '80px', whiteSpace: 'nowrap' }}>
                      <Chip label={log.userRole} size="small" color="primary" />
                    </TableCell>
                    <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>
                      <Chip 
                        label={log.majorCategory} 
                        size="small" 
                        color={getCategoryColor(log.majorCategory)} 
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>{log.middleCategory}</TableCell>
                    <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>{log.minorCategory}</TableCell>
                    <TableCell sx={{ minWidth: '100px', whiteSpace: 'nowrap' }}>
                      <Chip 
                        label={log.action} 
                        size="small" 
                        color={getActionColor(log.action)} 
                      />
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        minWidth: '200px', 
                        whiteSpace: 'nowrap',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={log.details}
                    >
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </Box>
  );
};

export default LogViewer;
