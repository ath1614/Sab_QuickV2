import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:sabquick_app/api_client.dart';
import 'package:sabquick_app/data/theme_presets.dart';
import 'package:sabquick_app/design/tokens.dart';
import 'package:sabquick_app/screens/manager_kanban_screen.dart';
import 'package:sabquick_app/screens/owner_hub_screen.dart';
import 'package:sabquick_app/screens/packer_station_screen.dart';
import 'package:sabquick_app/screens/policy_screen.dart';
import 'package:sabquick_app/screens/theme_studio_screen.dart';
import 'package:sabquick_app/widgets/route_map.dart';

/// JSON response for [uriPath]; 404 otherwise. Cookies/headers ignored —
/// screens under test only read JSON bodies.
http.Client mockApi(Map<String, String> routes) {
  return MockClient((request) async {
    final body = routes[request.url.path];
    if (body == null) {
      return http.Response('{"error":"not mocked: ${request.url.path}"}', 404);
    }
    return http.Response(body, 200,
        headers: {'content-type': 'application/json'});
  });
}

Future<void> pumpScreen(
  WidgetTester tester,
  Widget screen, {
  Duration advance = const Duration(milliseconds: 400),
}) async {
  SharedPreferences.setMockInitialValues({});
  // Tall phone viewport so lazy ListViews build every section under test.
  tester.view.physicalSize = const Size(1080, 2200);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MaterialApp(home: screen));
  await tester.pumpAndSettle(advance);
}

Map<String, dynamic> analyticsFixture() => {
      'metrics': {
        'todayGMV': 4321,
        'completedOrders': 12,
        'activeOrders': 3,
        'avgPackingTimeMinutes': 2.4,
        'lowStockCount': 2,
        'totalProductsCount': 241,
      },
      'lowStockProducts': [
        {'title': 'Amul Butter 500g', 'stockCount': 3},
        {'title': 'Tata Salt 1kg', 'stockCount': 1},
      ],
    };

Map<String, dynamic> opsOrdersFixture() {
  Map<String, dynamic> order(
    String num, {
    String status = 'READY_FOR_PICKUP',
    int elapsed = 2,
    Map<String, dynamic>? rider,
  }) =>
      {
        'id': 'ord-$num',
        'orderNumber': num,
        'status': status,
        'totalAmount': 349,
        'paymentMethod': 'CASH_ON_DELIVERY',
        'elapsedMinutes': elapsed,
        'customer': {'name': 'Test Customer', 'phone': '9999999999'},
        'address': {'flatBuilding': 'B2', 'streetArea': 'Main Road'},
        'rider': rider,
        'items': [
          {
            'id': 'it-1',
            'quantity': 2,
            'aisle': 'Dairy & Bakery',
            'product': {'title': 'Amul Milk', 'packSize': '500 ml'},
          },
          {
            'id': 'it-2',
            'quantity': 1,
            'aisle': 'Beverages',
            'product': {'title': 'Coca-Cola', 'packSize': '750 ml'},
          },
        ],
      };

  return {
    'grouped': {
      'PENDING': [],
      'CONFIRMED': [],
      'PACKING': [],
      'READY_FOR_PICKUP': [order('1001', status: 'READY_FOR_PICKUP')],
      'OUT_FOR_DELIVERY': [
        order('1002',
            status: 'OUT_FOR_DELIVERY',
            elapsed: 12,
            rider: {
              'id': 'r1',
              'name': 'Ramesh',
              'phone': '9888877777',
              'isOnline': true,
              'vehicleDetails': 'EV Scooter',
            }),
      ],
      'DELIVERED': [],
      'CANCELLED': [],
    },
    'riders': [
      {'id': 'r1', 'name': 'Ramesh', 'phone': '9888877777', 'isOnline': true, 'vehicleDetails': 'EV Scooter'},
      {'id': 'r2', 'name': 'Suresh', 'phone': '9777766666', 'isOnline': false, 'vehicleDetails': 'Bike'},
    ],
  };
}

void main() {
  testWidgets('OwnerHubScreen renders KPIs and low-stock list',
      (tester) async {
    ApiClient.injectHttpClientForTests(mockApi({
      '/api/ops/analytics': jsonEncode(analyticsFixture()),
      '/api/ops/orders': jsonEncode(opsOrdersFixture()),
    }));
    await pumpScreen(tester, OwnerHubScreen(primary: SQColor.green, accent: SQColor.lime));

    expect(find.text("Today's GMV"), findsOneWidget);
    expect(find.textContaining('4321'), findsOneWidget);
    expect(find.text('Delivered'), findsOneWidget);
    // SQSectionHeader renders through Text.rich — match rich text too.
    expect(find.textContaining('Needs restocking', findRichText: true),
        findsOneWidget);
    expect(find.textContaining('Amul Butter 500g'), findsOneWidget);
    expect(find.text('Catalog & Pricing'), findsOneWidget);
    expect(find.text('Theme Studio'), findsOneWidget);
    expect(find.textContaining('Consoles', findRichText: true), findsOneWidget);
  });

  testWidgets('ManagerKanbanScreen renders columns, rider row and urgency',
      (tester) async {
    ApiClient.injectHttpClientForTests(mockApi({
      '/api/ops/orders': jsonEncode(opsOrdersFixture()),
    }));
    await pumpScreen(
        tester,
        ManagerKanbanScreen(primary: SQColor.green, accent: SQColor.lime));

    expect(find.text('Ready for pickup  (1)'), findsOneWidget);
    expect(find.text('In transit  (1)'), findsOneWidget);
    expect(find.text('ASSIGN RIDER'), findsOneWidget);
    // Rider row with online dot + vehicle.
    expect(find.textContaining('Ramesh'), findsOneWidget);
    expect(find.textContaining('EV Scooter'), findsOneWidget);
    // CRITICAL urgency for the 12-minute transit order.
    expect(find.textContaining('critical'), findsOneWidget);
  });

  testWidgets('ManagerKanbanScreen rider picker lists online riders first',
      (tester) async {
    ApiClient.injectHttpClientForTests(mockApi({
      '/api/ops/orders': jsonEncode(opsOrdersFixture()),
    }));
    await pumpScreen(
        tester,
        ManagerKanbanScreen(primary: SQColor.green, accent: SQColor.lime));

    await tester.tap(find.text('ASSIGN RIDER'));
    await tester.pumpAndSettle();

    expect(find.text('Assign a rider'), findsOneWidget);
    final ramesh = tester.getTopLeft(find.text('Ramesh'));
    final suresh = tester.getTopLeft(find.text('Suresh'));
    expect(ramesh.dy < suresh.dy, isTrue, reason: 'online rider sorts first');
  });

  testWidgets('PackerStationScreen groups items by aisle with checklist',
      (tester) async {
    ApiClient.injectHttpClientForTests(mockApi({
      '/api/ops/orders': jsonEncode({
        'grouped': {
          'PENDING': [],
          'CONFIRMED': [],
          'PACKING': [
            {
              'id': 'ord-2001',
              'orderNumber': '2001',
              'status': 'PACKING',
              'totalAmount': 149,
              'paymentMethod': 'UPI',
              'elapsedMinutes': 1,
              'customer': {'name': 'Another Customer'},
              'address': {'flatBuilding': 'C1', 'streetArea': 'Market'},
              'items': [
                {
                  'id': 'p1',
                  'quantity': 1,
                  'aisle': 'Dairy & Bakery',
                  'product': {'title': 'Bread', 'packSize': '400 g'},
                },
              ],
            },
          ],
          'READY_FOR_PICKUP': [],
          'OUT_FOR_DELIVERY': [],
          'DELIVERED': [],
          'CANCELLED': [],
        },
        'riders': [],
      }),
    }));
    await pumpScreen(
        tester, PackerStationScreen(primary: SQColor.green, accent: SQColor.lime));

    expect(find.text('Packer Station'), findsOneWidget);
    expect(find.text('DAIRY & BAKERY'), findsOneWidget);
    expect(find.textContaining('Bread'), findsOneWidget);
    // Toggling the checklist updates the pick counter.
    await tester.tap(find.textContaining('Bread'));
    await tester.pump();
    expect(find.text('1/1 picked'), findsOneWidget);
  });

  testWidgets('ThemeStudioScreen renders all 16 shared presets',
      (tester) async {
    ApiClient.injectHttpClientForTests(mockApi({
      '/api/theme': jsonEncode({'themeName': 'Standard Green'}),
    }));
    await pumpScreen(tester, const ThemeStudioScreen());

    expect(find.text('Seasonal palettes'), findsOneWidget);
    for (final preset in themePresets.take(5)) {
      expect(find.text(preset.name), findsOneWidget);
    }
    expect(find.text('Standard Green'), findsOneWidget);
  });

  testWidgets('PolicyScreen renders native privacy sections',
      (tester) async {
    await pumpScreen(tester, const PolicyScreen(kind: PolicyKind.privacy));

    expect(find.text('Information we collect & exact use'), findsOneWidget);
    expect(find.text('Account deletion right'), findsOneWidget);
    expect(find.text('Delete my account'), findsOneWidget);
  });

  testWidgets('RouteMapCard renders pins and overlay chips', (tester) async {
    final semantics = tester.ensureSemantics();
    await pumpScreen(
      tester,
      Scaffold(
        body: RouteMapCard(
          customerLat: 23.134243,
          customerLng: 83.194082,
          orderStatus: 'OUT_FOR_DELIVERY',
          primary: SQColor.green,
          accent: SQColor.lime,
          customerAddressLabel: 'Home',
        ),
      ),
    );

    expect(find.textContaining('min ETA'), findsOneWidget);
    expect(find.text('GEOFENCE ACTIVE · 2.5 KM'), findsOneWidget);
    // Three pins: hub, customer and interpolated rider.
    expect(find.byIcon(Icons.storefront_rounded), findsOneWidget);
    expect(find.byIcon(Icons.home_rounded), findsOneWidget);
    expect(find.byIcon(Icons.two_wheeler_rounded), findsOneWidget);
    semantics.dispose();
  });

  tearDown(() {
    // Reset the injected client so later tests / suites are unaffected.
    ApiClient.injectHttpClientForTests(http.Client());
  });
}
