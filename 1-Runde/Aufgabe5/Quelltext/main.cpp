#include "bits/stdc++.h"

using namespace std;

struct RoutePunkt {
  string name;
  int year;
  bool essential;
  int acc_distance;
};

struct TeilRoute {
  int start_index;
  int end_index;
  int distance;

  bool operator<(const TeilRoute& other) { return other.distance > distance; }
};

RoutePunkt parse_line(string line) {
  vector<string> values;
  stringstream ss(line);
  for (int i = 0; i < 4; i++) {
    string substr;
    getline(ss, substr, ',');
    values.push_back(substr);
  }

  RoutePunkt result;
  result.name = values[0];
  result.year = stoi(values[1]);
  result.essential = (values[2] == "X");
  result.acc_distance = stoi(values[3]);

  return result;
}

bool is_valid_teilroute(vector<RoutePunkt> route, TeilRoute tr) {
  for (int i = tr.start_index + 1; i < tr.end_index; i++) {
    RoutePunkt punkt = route[i];
    if (punkt.essential) return false;
  }
  return true;
}

vector<TeilRoute> find_teilrouten(vector<RoutePunkt> route) {
  unordered_map<string, vector<int>> hm_punkte;
  for (int i = 0; i < route.size(); i++) {
    hm_punkte[route[i].name].push_back(i);
  }

  vector<TeilRoute> result;
  for (int i = 0; i < route.size(); i++) {
    vector<int> gleiche_punkte = hm_punkte[route[i].name];
    if (gleiche_punkte.size() < 2) continue;
    for (int j = 0; j < gleiche_punkte.size() - 1; j++) {
      int start_index = gleiche_punkte[j];
      int end_index = gleiche_punkte[j + 1];
      if (start_index < i) continue;
      RoutePunkt start = route[start_index];
      RoutePunkt end = route[end_index];
      int distance = end.acc_distance - start.acc_distance;
      TeilRoute teilroute = {start_index, end_index, distance};
      if (is_valid_teilroute(route, teilroute)) result.push_back(teilroute);
    }
  }
  return result;
}

vector<TeilRoute> filter_best_teilroutes(vector<RoutePunkt> route,
                                         vector<TeilRoute> trs) {
  if (trs.size() < 2) return trs;
  vector<TeilRoute> best;
  for (int i = 0; i < trs.size(); i++) {
    if (trs[i + 1].start_index <= trs[i].end_index) {
      best.push_back(trs[i + 1] < trs[i] ? trs[i] : trs[i + 1]);
      i++;
      continue;
    }
    best.push_back(trs[i]);
  }
  return best;
}

void print_best(vector<RoutePunkt>& route, vector<TeilRoute>& trs) {
  int i = 0;
  while (i < route.size()) {
    auto it = find_if(trs.begin(), trs.end(), [&i](const TeilRoute& tr) {
      return i > tr.start_index && i < tr.end_index;
    });

    if (it != trs.end()) {
      for (int j = it->end_index; j < route.size(); j++) {
        route[j].acc_distance -= it->distance;
      }
      i = it->end_index;
    } else {
      cout << route[i].name << "," << route[i].year << ","
           << (route[i].essential ? 'X' : ' ') << "," << route[i].acc_distance
           << "\n";
      i++;
    }
  }
}

int main() {
  int n;
  cin >> n;
  cin.ignore();

  vector<RoutePunkt> initial_route;
  vector<RoutePunkt> result;

  string line;
  for (int i = 0; i < n; i++) {
    getline(cin, line);
    initial_route.push_back(parse_line(line));
  }

  vector<TeilRoute> trs = find_teilrouten(initial_route);
  vector<TeilRoute> best_trs = filter_best_teilroutes(initial_route, trs);
  print_best(initial_route, best_trs);

  return 0;
}
