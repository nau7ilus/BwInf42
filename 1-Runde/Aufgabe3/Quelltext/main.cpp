#include "bits/stdc++.h"

int ROW, COL, DEPTH = 2;

struct Point {
  int x;
  int y;
  int z;

  bool operator==(const Point& other) const {
    return x == other.x && y == other.y && z == other.z;
  }
};

struct PriorityPoint {
  Point point;
  int priority;

  bool operator<(const PriorityPoint& other) const {
    return priority > other.priority;
  }
};

namespace std {
template <>
struct hash<Point> {
  size_t operator()(const Point& p) const {
    return hash<int>()(p.x) ^ hash<int>()(p.y) ^ hash<int>()(p.z);
  }
};
}  // namespace std

using namespace std;

bool is_valid(int x, int y, int z) {
  return (y >= 0) && (y < ROW) && (x >= 0) && (x < COL) && (z >= 0) &&
         (z < DEPTH);
}

const int yNum[] = {-1, 1, 0, 0, 0, 0};
const int xNum[] = {0, 0, -1, 1, 0, 0};
const int zNum[] = {0, 0, 0, 0, 1, -1};

vector<Point> get_neighbors(vector<vector<vector<char>>> mat, Point pt) {
  vector<Point> result;
  for (int i = 0; i < 6; i++) {
    int y = pt.y + yNum[i];
    int x = pt.x + xNum[i];
    int z = pt.z + zNum[i];
    if (!is_valid(x, y, z) || mat[z][y][x] == '#') continue;
    result.push_back({x, y, z});
  }
  return result;
}

void print_maze(vector<vector<vector<char>>> mat) {
  for (int z = 0; z < DEPTH; z++) {
    for (int y = 0; y < mat[z].size(); y++) {
      for (int x = 0; x < mat[z][y].size(); x++) {
        cout << mat[z][y][x];
      }
      cout << "\n";
    }
  }
}

int get_cost(Point a, Point b) { return a.z == b.z ? 1 : 3; }

int heuristic(Point a, Point b) {
  return abs(a.x - b.x) + abs(a.y - b.y) + abs(a.z - b.z);
}

vector<Point> get_solution_path(unordered_map<Point, Point> came_from,
                                Point start, Point finish) {
  vector<Point> path;
  Point current = finish;
  while (current != start) {
    path.push_back(current);
    current = came_from[current];
  }
  path.push_back(start);
  return path;
}

pair<int, vector<Point>> find_path(vector<vector<vector<char>>> mat,
                                   Point start, Point finish) {
  priority_queue<PriorityPoint> frontier;
  frontier.push({start, 0});

  unordered_map<Point, Point> came_from;
  came_from[start] = {};

  unordered_map<Point, int> cost_so_far;
  cost_so_far[start] = 0;

  while (!frontier.empty()) {
    Point current = frontier.top().point;
    frontier.pop();
    if (current == finish) break;
    for (Point next : get_neighbors(mat, current)) {
      int new_cost = cost_so_far[current] + get_cost(current, next);
      if (came_from.count(next) == 0 || new_cost < cost_so_far[next]) {
        cost_so_far[next] = new_cost;
        frontier.push({next, new_cost + heuristic(finish, next)});
        came_from[next] = current;
      }
    }
  }

  int best_cost = cost_so_far[finish];
  vector<Point> solution_path = get_solution_path(came_from, start, finish);

  return {best_cost, solution_path};
}

void display_solution(vector<vector<vector<char>>> mat, vector<Point> path) {
  for (int i = path.size() - 2; i >= 0; i--) {
    Point cur_point = path[i];
    Point prev_point = path[i + 1];
    char& cur_value = mat[cur_point.z][cur_point.y][cur_point.x];
    char& prev_value = mat[prev_point.z][prev_point.y][prev_point.x];
    if (cur_point.z != prev_point.z)
      prev_value = '!';
    else if (cur_point.x > prev_point.x)
      prev_value = '>';
    else if (cur_point.x < prev_point.x)
      prev_value = '<';
    else if (cur_point.y > prev_point.y)
      prev_value = 'v';
    else
      prev_value = '^';
  }

  print_maze(mat);
}

int main() {
  cin >> ROW >> COL;
  vector<vector<vector<char>>> mat(
      DEPTH, vector<vector<char>>(ROW, vector<char>(COL)));

  Point source, dest;

  for (int z = 0; z < DEPTH; z++) {
    for (int y = 0; y < ROW; y++) {
      for (int x = 0; x < COL; x++) {
        cin >> mat[z][y][x];
        if (mat[z][y][x] == 'A')
          source = {x, y, z};
        else if (mat[z][y][x] == 'B')
          dest = {x, y, z};
      }
    }
  }

  pair<int, vector<Point>> solution = find_path(mat, source, dest);
  cout << "Beste Zeit: " << solution.first << "\n";
  display_solution(mat, solution.second);

  return 0;
}
