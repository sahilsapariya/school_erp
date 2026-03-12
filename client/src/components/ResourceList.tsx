import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SearchBar } from './ui/SearchBar';
import { theme } from '../design-system/theme';
import { Icons } from '../design-system/icons';

interface FilterOption {
  id: string;
  label: string;
}

interface ResourceListProps<T> {
  data: T[];
  renderItem: ({ item }: { item: T }) => React.ReactNode;
  keyExtractor: (item: T) => string;
  filterOptions?: FilterOption[];
  onSearch?: (query: string) => void;
  onFilterChange?: (filterId: string) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  title?: string;
  actionButton?: React.ReactNode;
  emptyState?: React.ReactNode;
  headerComponent?: React.ReactNode;
}

export function ResourceList<T>({
  data,
  renderItem,
  keyExtractor,
  filterOptions,
  onSearch,
  onFilterChange,
  onRefresh,
  refreshing = false,
  title,
  actionButton,
  emptyState,
  headerComponent,
}: ResourceListProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(filterOptions?.[0]?.id || null);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearch?.(text);
  };

  const handleFilter = (filterId: string) => {
    setActiveFilter(filterId);
    onFilterChange?.(filterId);
  };

  const ListHeader = (
    <>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {actionButton}
        </View>
      )}
      {headerComponent}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search..."
        />
      </View>
      {filterOptions && filterOptions.length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            {filterOptions.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterChip,
                  activeFilter === filter.id && styles.activeFilterChip,
                ]}
                onPress={() => handleFilter(filter.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter.id && styles.activeFilterText,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );

  const defaultEmpty = (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBg}>
        <Icons.Search size={28} color={theme.colors.text[400]} />
      </View>
      <Text style={styles.emptyText}>No results found</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderItem as any}
        keyExtractor={keyExtractor}
        contentContainerStyle={[styles.listContent, data.length === 0 && styles.listContentEmpty]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={emptyState ?? defaultEmpty}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary[500]}
              colors={[theme.colors.primary[500]]}
            />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.m,
    paddingTop: theme.spacing.m,
    paddingBottom: theme.spacing.s,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text[900],
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.m,
    marginBottom: theme.spacing.s,
  },
  filtersContainer: {
    marginBottom: theme.spacing.s,
  },
  filtersContent: {
    paddingHorizontal: theme.spacing.m,
    gap: theme.spacing.s,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  filterText: {
    ...theme.typography.caption,
    color: theme.colors.text[500],
    fontWeight: '500',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: theme.spacing.m,
    paddingBottom: theme.spacing.xl + 60,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.m,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.text[500],
  },
});
